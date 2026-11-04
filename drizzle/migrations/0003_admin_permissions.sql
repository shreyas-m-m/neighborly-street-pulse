-- 0003_admin_permissions.sql
-- Role-based access control (RBAC) for Admins and Resolvers
-- Hardened against privilege escalation, unauthorized updates, concurrency races, and data leaks.

-- 1. Create app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'resolver');
  END IF;
END $$;

-- 2. Profiles table linked to auth.users (strictly for authenticated team members)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Restrict profiles reads strictly to authenticated users (prevents email harvesting by anon)
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated team members can view profiles" ON public.profiles;
CREATE POLICY "Authenticated team members can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 4. Helper security definer functions with locked search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    auth.role() = 'service_role'
    OR current_user = 'postgres'
    OR COALESCE(public.has_role(auth.uid(), 'admin'), false)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_resolve()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    auth.role() = 'service_role'
    OR current_user = 'postgres'
    OR COALESCE(public.has_role(auth.uid(), 'admin'), false)
    OR COALESCE(public.has_role(auth.uid(), 'resolver'), false)
  );
$$;

-- 5. Atomic, email-restricted, one-time bootstrap configuration table
-- Initialized without arbitrary placeholder emails.
CREATE TABLE IF NOT EXISTS public.admin_bootstrap_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bootstrap_email text,
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_by uuid REFERENCES auth.users(id),
  claimed_at timestamptz
);

ALTER TABLE public.admin_bootstrap_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_bootstrap_config FROM anon;
GRANT SELECT ON public.admin_bootstrap_config TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view bootstrap config" ON public.admin_bootstrap_config;
CREATE POLICY "Authenticated users can view bootstrap config" ON public.admin_bootstrap_config
  FOR SELECT TO authenticated USING (true);

-- Initialize config row with NULL email (no arbitrary placeholder email!)
INSERT INTO public.admin_bootstrap_config (id, bootstrap_email, is_claimed)
VALUES (1, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- 6. Atomic, concurrency-safe initial Admin claim function
CREATE OR REPLACE FUNCTION public.claim_initial_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_email text;
  designated_email text;
  already_claimed boolean;
  admin_count integer;
BEGIN
  -- 1. Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Concurrency protection: acquire transaction-level advisory lock
  -- Strictly serializes concurrent requests to prevent simultaneous race conditions
  PERFORM pg_advisory_xact_lock(hashtext('admin_bootstrap_lock'));

  -- 3. Check if an administrator already exists
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Bootstrap closed: An administrator is already registered.';
  END IF;

  -- 4. Check configuration table with exclusive row-level lock
  SELECT bootstrap_email, is_claimed
  INTO designated_email, already_claimed
  FROM public.admin_bootstrap_config
  WHERE id = 1
  FOR UPDATE;

  IF designated_email IS NULL OR btrim(designated_email) = '' THEN
    RAISE EXCEPTION 'Initial admin email has not been configured in the database.';
  END IF;

  IF already_claimed THEN
    RAISE EXCEPTION 'Initial admin has already been claimed.';
  END IF;

  -- 5. Verify caller's authenticated email matches the authorized bootstrap email
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR lower(trim(caller_email)) <> lower(trim(designated_email)) THEN
    RAISE EXCEPTION 'Unauthorized: Your email (%) does not match the configured initial administrator email.', caller_email;
  END IF;

  -- 6. Atomically mark claimed and grant admin role
  UPDATE public.admin_bootstrap_config
  SET is_claimed = true, claimed_by = auth.uid(), claimed_at = now()
  WHERE id = 1;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.claim_initial_admin();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_initial_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

-- 7. Trigger preventing removal or downgrade of the last administrator
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'admin') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role <> 'admin') THEN

    SELECT count(*) INTO remaining_admins
    FROM public.user_roles
    WHERE role = 'admin' AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Operation blocked: Cannot delete or downgrade the last remaining administrator.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 8. Policies on user_roles
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view user roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view user roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. Automatic user profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users if any
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 10. Enforce resolution permission on incidents (UPDATE restricted to authenticated resolvers)
REVOKE UPDATE ON public.incidents FROM anon;
REVOKE UPDATE (status, resolution_photo_path, resolution_note) ON public.incidents FROM anon;
GRANT UPDATE (status, resolution_photo_path, resolution_note) ON public.incidents TO authenticated;

DROP POLICY IF EXISTS "Anyone can update incident status" ON public.incidents;
DROP POLICY IF EXISTS "Authorized resolvers can update incident status" ON public.incidents;

CREATE POLICY "Authorized resolvers can update incident status" ON public.incidents
  FOR UPDATE TO authenticated
  USING (public.can_resolve())
  WITH CHECK (public.can_resolve());

-- Resolution trigger function: checks only protected columns (status, resolution_photo_path, resolution_note)
-- Ensures unrelated updates (e.g. updated_at timestamp or future content edits) do not fail
CREATE OR REPLACE FUNCTION public.incidents_require_resolution_photo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Only enforce permission checks if one of the protected columns is modified
  IF (NEW.status IS DISTINCT FROM OLD.status) OR
     (NEW.resolution_photo_path IS DISTINCT FROM OLD.resolution_photo_path) OR
     (NEW.resolution_note IS DISTINCT FROM OLD.resolution_note) THEN

    IF NOT public.can_resolve() THEN
      RAISE EXCEPTION 'Unauthorized: Only designated Resolvers or Admins can update incident status, resolution photo, or resolution note.';
    END IF;

    -- Enforce resolution photo requirement whenever incident is in resolved state
    IF NEW.status = 'resolved' AND NEW.resolution_photo_path IS NULL THEN
      RAISE EXCEPTION 'A resolution photo is required before marking an incident resolved.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Explicitly attach trigger to public.incidents
DROP TRIGGER IF EXISTS incidents_require_resolution_photo ON public.incidents;
CREATE TRIGGER incidents_require_resolution_photo
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.incidents_require_resolution_photo();

-- 11. Storage bucket policies for incident-photos
DROP POLICY IF EXISTS "Anyone can upload incident photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload original incident photos" ON storage.objects;
DROP POLICY IF EXISTS "Resolvers can upload resolution photos" ON storage.objects;

CREATE POLICY "Anyone can upload original incident photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'incident-photos'
    AND name ~ '^original/[A-Za-z0-9-]+\.(jpg|png|webp)$'
    AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg','image/png','image/webp')
  );

CREATE POLICY "Resolvers can upload resolution photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'incident-photos'
    AND name ~ '^resolution/[A-Za-z0-9-]+\.(jpg|png|webp)$'
    AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg','image/png','image/webp')
    AND public.can_resolve()
  );
