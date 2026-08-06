-- 1. Public catalog: expose only slug + data through a view, not user_id
CREATE OR REPLACE VIEW public.public_catalogs_public
WITH (security_invoker = off) AS
SELECT slug, data, updated_at FROM public.public_catalogs;

GRANT SELECT ON public.public_catalogs_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read catalogs" ON public.public_catalogs;
CREATE POLICY "Owners can read their catalogs"
ON public.public_catalogs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

REVOKE SELECT ON public.public_catalogs FROM anon;

-- 2. lifetime_emails: explicit service_role management
GRANT ALL ON public.lifetime_emails TO service_role;
DROP POLICY IF EXISTS "Service role manages lifetime emails" ON public.lifetime_emails;
CREATE POLICY "Service role manages lifetime emails"
ON public.lifetime_emails FOR ALL TO service_role
USING (true) WITH CHECK (true);