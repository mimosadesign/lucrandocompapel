DROP VIEW IF EXISTS public.public_catalogs_public;

CREATE OR REPLACE FUNCTION public.get_public_catalog(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT data FROM public.public_catalogs WHERE slug = _slug LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_catalog(text) TO anon, authenticated;