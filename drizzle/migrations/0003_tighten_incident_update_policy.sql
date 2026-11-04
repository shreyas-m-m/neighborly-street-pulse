DROP POLICY IF EXISTS "Anyone can update incident status" ON public.incidents;
CREATE POLICY "Anyone can update incident status"
ON public.incidents FOR UPDATE TO anon, authenticated
USING (status IN ('open', 'in_progress', 'resolved'))
WITH CHECK (
  status IN ('open', 'in_progress', 'resolved')
  AND (status <> 'resolved' OR resolution_photo_path IS NOT NULL)
);