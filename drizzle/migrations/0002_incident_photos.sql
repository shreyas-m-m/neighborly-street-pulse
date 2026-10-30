ALTER TABLE public.incidents
  ADD COLUMN original_photo_path text,
  ADD COLUMN resolution_photo_path text,
  ADD COLUMN resolution_note text;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_original_photo_path_chk CHECK (original_photo_path IS NULL OR original_photo_path ~ '^original/[A-Za-z0-9-]+\.(jpg|png|webp)$'),
  ADD CONSTRAINT incidents_resolution_photo_path_chk CHECK (resolution_photo_path IS NULL OR resolution_photo_path ~ '^resolution/[A-Za-z0-9-]+\.(jpg|png|webp)$'),
  ADD CONSTRAINT incidents_resolution_note_chk CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 500);

GRANT INSERT (original_photo_path) ON public.incidents TO anon, authenticated;
GRANT UPDATE (resolution_photo_path, resolution_note) ON public.incidents TO anon, authenticated;

-- A report can only move to resolved when it has a resolution photo.
CREATE OR REPLACE FUNCTION public.incidents_require_resolution_photo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' AND NEW.resolution_photo_path IS NULL THEN
    RAISE EXCEPTION 'A resolution photo is required before marking an incident resolved.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER incidents_require_resolution_photo BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.incidents_require_resolution_photo();

-- Storage: anyone may view and upload new photos in this bucket only; no overwrite or delete.
CREATE POLICY "Anyone can view incident photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'incident-photos');
CREATE POLICY "Anyone can upload incident photos" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'incident-photos'
    AND name ~ '^(original|resolution)/[A-Za-z0-9-]+\.(jpg|png|webp)$'
    AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg','image/png','image/webp')
  );