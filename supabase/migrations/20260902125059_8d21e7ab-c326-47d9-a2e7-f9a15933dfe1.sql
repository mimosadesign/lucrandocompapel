CREATE TABLE public.user_data_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  version bigint NOT NULL,
  source text NOT NULL DEFAULT 'sync',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key, version)
);

GRANT SELECT, INSERT, DELETE ON public.user_data_versions TO authenticated;
GRANT ALL ON public.user_data_versions TO service_role;

ALTER TABLE public.user_data_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data versions"
  ON public.user_data_versions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users restore own data versions"
  ON public.user_data_versions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own data versions"
  ON public.user_data_versions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX user_data_versions_user_key_created_idx
  ON public.user_data_versions (user_id, key, created_at DESC);

CREATE OR REPLACE FUNCTION public.capture_user_data_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.value = OLD.value THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(v.version), 0) + 1
    INTO next_version
    FROM public.user_data_versions v
   WHERE v.user_id = NEW.user_id
     AND v.key = NEW.key;

  INSERT INTO public.user_data_versions (user_id, key, value, version, source)
  VALUES (NEW.user_id, NEW.key, NEW.value, next_version, 'sync');

  DELETE FROM public.user_data_versions v
   WHERE v.user_id = NEW.user_id
     AND v.key = NEW.key
     AND v.id NOT IN (
       SELECT kept.id
         FROM public.user_data_versions kept
        WHERE kept.user_id = NEW.user_id
          AND kept.key = NEW.key
        ORDER BY kept.created_at DESC, kept.version DESC
        LIMIT 100
     );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_user_data_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_user_data_version() TO service_role;

CREATE TRIGGER capture_user_data_version_after_write
AFTER INSERT OR UPDATE OF value ON public.user_data
FOR EACH ROW
EXECUTE FUNCTION public.capture_user_data_version();

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_data;