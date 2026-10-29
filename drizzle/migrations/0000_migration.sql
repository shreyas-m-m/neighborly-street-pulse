CREATE TABLE public.incidents (
  id text PRIMARY KEY DEFAULT ('INC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 80),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 1000),
  category text NOT NULL CHECK (category IN ('garbage','roads','water','lights')),
  location text NOT NULL CHECK (char_length(btrim(location)) BETWEEN 3 AND 150),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  people_affected integer NOT NULL CHECK (people_affected BETWEEN 1 AND 1000000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public demo: anyone can read, submit (only content columns), and change status only.
GRANT SELECT ON public.incidents TO anon, authenticated;
GRANT INSERT (title, description, category, location, severity, people_affected) ON public.incidents TO anon, authenticated;
GRANT UPDATE (status) ON public.incidents TO anon, authenticated;
GRANT ALL ON public.incidents TO service_role;

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view incidents" ON public.incidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can report an open incident" ON public.incidents FOR INSERT TO anon, authenticated WITH CHECK (status = 'open');
CREATE POLICY "Anyone can update incident status" ON public.incidents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.incidents_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.incidents_set_updated_at();

CREATE INDEX incidents_created_at_idx ON public.incidents (created_at DESC);