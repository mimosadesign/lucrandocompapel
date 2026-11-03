REVOKE UPDATE, INSERT ON public.profiles FROM authenticated;
GRANT UPDATE (nome, nome_atelier, whatsapp, cidade, estado, tema_cor, updated_at) ON public.profiles TO authenticated;
GRANT INSERT (id, nome, nome_atelier, whatsapp, cidade, estado, tema_cor) ON public.profiles TO authenticated;