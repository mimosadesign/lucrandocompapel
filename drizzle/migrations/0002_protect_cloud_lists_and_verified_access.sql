CREATE OR REPLACE FUNCTION public.protect_user_data_lists()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE tombs jsonb; merged jsonb;
BEGIN
  IF NEW.key LIKE 'lcp:tomb:%' THEN
    IF jsonb_typeof(NEW.value) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Deletion markers must be an array'; END IF;
    SELECT COALESCE(jsonb_agg(DISTINCT item), '[]'::jsonb) INTO NEW.value
      FROM jsonb_array_elements(NEW.value || CASE WHEN TG_OP='UPDATE' THEN OLD.value ELSE '[]'::jsonb END) item;
    RETURN NEW;
  END IF;
  IF NEW.key !~ '^lcp:(materiais|produtos|pedidos|orcamentos|caixa:lancamentos|caixa:vendas|precItens|tabelasPrecos|formulas|fornecedores|fichasTecnicas|agendaProducao|datasClientes|contas|custos:maquinas|custos:ferramentas|custos:indiretos|precif:gastos|materiais:historico|cronometro:sessoes)$' THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.value) IS DISTINCT FROM 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.value) item WHERE jsonb_typeof(item) IS DISTINCT FROM 'object' OR item->>'id' IS NULL) THEN
    RAISE EXCEPTION 'Protected records must be an array of objects with IDs';
  END IF;
  SELECT value INTO tombs FROM public.user_data WHERE user_id=NEW.user_id AND key='lcp:tomb:'||NEW.key;
  tombs := COALESCE(tombs,'[]'::jsonb);
  SELECT COALESCE(jsonb_agg(item ORDER BY ord), '[]'::jsonb) INTO merged FROM (
    SELECT DISTINCT ON (item->>'id') item, ord FROM jsonb_array_elements(NEW.value || CASE WHEN TG_OP='UPDATE' THEN OLD.value ELSE '[]'::jsonb END) WITH ORDINALITY a(item,ord)
    WHERE NOT (tombs ? (item->>'id')) ORDER BY item->>'id', ord
  ) unique_items;
  NEW.value := merged;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.protect_user_data_lists() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_user_data_lists_before_write BEFORE INSERT OR UPDATE ON public.user_data FOR EACH ROW EXECUTE FUNCTION public.protect_user_data_lists();
CREATE OR REPLACE FUNCTION public.capture_user_data_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_version bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.value = OLD.value THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(v.version),0)+1 INTO next_version FROM public.user_data_versions v WHERE v.user_id=NEW.user_id AND v.key=NEW.key;
  INSERT INTO public.user_data_versions(user_id,key,value,version,source) VALUES(NEW.user_id,NEW.key,NEW.value,next_version,'sync');
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.capture_user_data_version() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.own_confirmed_email_matches(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email)=lower(_email));
$$;
REVOKE ALL ON FUNCTION public.own_confirmed_email_matches(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.own_confirmed_email_matches(text) TO authenticated, service_role;
ALTER POLICY "own email lookup" ON public.lifetime_emails USING (public.own_confirmed_email_matches(email));
REVOKE UPDATE, INSERT ON public.profiles FROM authenticated;
GRANT UPDATE (nome,nome_atelier,whatsapp,cidade,estado,tema_cor,updated_at) ON public.profiles TO authenticated;
GRANT INSERT (id,nome,nome_atelier,whatsapp,cidade,estado,tema_cor) ON public.profiles TO authenticated;
CREATE INDEX IF NOT EXISTS user_data_versions_account_key_version_idx ON public.user_data_versions(user_id,key,version DESC);