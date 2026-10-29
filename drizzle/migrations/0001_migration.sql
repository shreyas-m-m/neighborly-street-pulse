REVOKE ALL ON public.incidents FROM anon, authenticated;
GRANT SELECT ON public.incidents TO anon, authenticated;
GRANT INSERT (title, description, category, location, severity, people_affected) ON public.incidents TO anon, authenticated;
GRANT UPDATE (status) ON public.incidents TO anon, authenticated;