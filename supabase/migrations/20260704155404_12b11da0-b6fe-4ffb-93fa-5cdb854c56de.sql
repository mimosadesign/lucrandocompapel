
CREATE TABLE public.public_catalogs (
  slug TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT public_catalogs_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);

CREATE INDEX public_catalogs_user_id_idx ON public.public_catalogs(user_id);

GRANT SELECT ON public.public_catalogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_catalogs TO authenticated;
GRANT ALL ON public.public_catalogs TO service_role;

ALTER TABLE public.public_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read catalogs"
  ON public.public_catalogs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners can insert their catalogs"
  ON public.public_catalogs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their catalogs"
  ON public.public_catalogs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their catalogs"
  ON public.public_catalogs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_public_catalogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER public_catalogs_updated_at
BEFORE UPDATE ON public.public_catalogs
FOR EACH ROW EXECUTE FUNCTION public.touch_public_catalogs_updated_at();
