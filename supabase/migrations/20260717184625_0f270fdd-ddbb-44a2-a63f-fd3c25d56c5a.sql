CREATE TABLE IF NOT EXISTS public.lifetime_emails (
  email text PRIMARY KEY,
  granted_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lifetime_emails TO authenticated;
GRANT ALL ON public.lifetime_emails TO service_role;
ALTER TABLE public.lifetime_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own email lookup"
  ON public.lifetime_emails
  FOR SELECT
  TO authenticated
  USING (email = lower(coalesce(auth.jwt() ->> 'email', '')));