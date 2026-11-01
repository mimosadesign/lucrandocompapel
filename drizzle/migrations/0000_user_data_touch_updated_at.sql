CREATE OR REPLACE FUNCTION public.touch_user_data_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS user_data_touch_updated_at ON public.user_data;
CREATE TRIGGER user_data_touch_updated_at BEFORE UPDATE ON public.user_data
FOR EACH ROW EXECUTE FUNCTION public.touch_user_data_updated_at();