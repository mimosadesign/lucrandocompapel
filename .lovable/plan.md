# Plano: tirar o app do modo protótipo e ligar tudo de verdade

Vou consertar os 15 gaps do auditoria em 5 fases. No final, login, pagamento, limites de plano, perfil e cancelamento funcionam de ponta a ponta.

## Fase 1 — Autenticação real (Lovable Cloud)

- Criar tabelas no backend: `profiles` (nome, nome_atelier, whatsapp, cidade, estado, trial_start, tema_cor) ligada a `auth.users`, com trigger que cria o perfil no signup.
- Reescrever `/auth` para usar `supabase.auth.signUp` / `signInWithPassword` (e-mail + senha de verdade, com validação Zod).
- Substituir `src/lib/auth.ts` (que usa localStorage) por um hook `useUser()` baseado em `supabase.auth.getUser()` + `onAuthStateChange`.
- Mover rotas privadas para `src/routes/_authenticated/` para que o gate gerenciado do Cloud bloqueie acesso sem sessão (em vez do guard manual no `__root.tsx`).
- "Sair da conta" em Configurações chama `supabase.auth.signOut()` e redireciona para `/auth`.
- Página `/reset-password` para recuperação de senha.

## Fase 2 — Dados sincronizados no backend

Tabelas com RLS por `user_id` (cada usuário só vê os próprios dados) + GRANTs corretos:

- `materiais` (nome, unidade, quantidade, preço, etc.)
- `produtos` (nome, materiais usados, tempo, margem, preço final)
- `pedidos` (cliente, itens, status, datas)
- `configuracoes_usuario` (valor_hora, tema_cor, preferências)

Migrar `materiais.tsx`, `produtos.tsx`, `pedidos.tsx`, `faturamento.tsx`, etc. para ler/escrever via TanStack Query + server functions com `requireSupabaseAuth`. Dados passam a sincronizar entre dispositivos.

## Fase 3 — Pagamento real (webhook + entitlement seguro)

- Criar tabela `subscriptions` (padrão Stripe: `stripe_subscription_id`, `status`, `current_period_end`, `cancel_at_period_end`, `environment`).
- Criar webhook em `src/routes/api/public/payments/webhook.ts` que recebe `customer.subscription.created/updated/deleted` e grava/atualiza a `subscriptions` ligada ao `userId` (passado via metadata no checkout).
- Atualizar `createCheckoutSession` para incluir `metadata.userId` e `subscription_data.metadata.userId`, usar `customer_email` do usuário logado, e ativar tax/compliance handling.
- Criar hook `useSubscription()` que lê a tabela `subscriptions` filtrada por `user_id` + `environment`.
- Reescrever `isUnlimited` / `useIsUnlimited` para retornar `true` quando: trial ativo (25 dias) **OU** `subscription.status in ['active','trialing','past_due']` com `current_period_end` no futuro **OU** `canceled` mas ainda dentro do período pago. Assim trial expirado já não derruba quem pagou.
- Server function `getPlanGuard` que valida limites de plano no servidor (não só no cliente) — `materiais.tsx` e `produtos.tsx` deixam de ser burláveis via DevTools.
- `/assinar/sucesso` espera o webhook gravar a subscription e mostra "ativado" com base em dado real, não texto fixo.

## Fase 4 — Portal do Stripe + Perfil/Configurações funcionais

- Server function `createPortalSession` que abre o portal oficial do Stripe (cancelar, trocar cartão, ver faturas). Botão "Gerenciar assinatura" em Configurações abre o portal em nova aba.
- `/perfil` vira um formulário real ligado à tabela `profiles`: nome, nome do ateliê, WhatsApp, cidade, estado. Botão "Salvar" persiste no backend.
- Subseção "Segurança da conta": alterar e-mail (`supabase.auth.updateUser({ email })`) e alterar senha (`updateUser({ password })`).
- "Personalização visual (cor)" fica visível para todos mas só fica **editável** quando `useSubscription().isActive` é `true` — bloqueio com `DiamondLock`.
- "Sair da conta" finalmente funciona (Fase 1).

## Fase 5 — Limpezas

- Remover `src/lib/storage.ts` localStorage (substituído pelas server functions).
- Remover Google login (já tinha sido pedido antes) e qualquer referência ao "modo teste Diamante" pré-visualizar.
- Garantir que badge "Teste 25 dias" só aparece para usuário em trial sem assinatura ativa; assinantes veem "Plano Diamante ativo" + dias até a próxima cobrança.

## Detalhes técnicos (para registro)

- Auth: Cloud (Supabase) email+senha. `requireSupabaseAuth` em todas as server functions de dados. `attachSupabaseAuth` já está em `start.ts`.
- Stripe: continua via gateway (`createStripeClient` do `stripe.server.ts`), checkout embedded já implementado. Adiciona webhook + portal.
- RLS: `auth.uid() = user_id` em todas as tabelas de dados; `subscriptions` policy SELECT em `user_id`, INSERT/UPDATE só via `service_role` (webhook).
- Entitlement gate: hook único `useEntitlement()` que devolve `{ inTrial, isPaid, isUnlimited, daysLeft, plan }` e é a única fonte de verdade para gates de UI; servidor revalida em escritas sensíveis.

## Como você testa no preview

1. **Cadastro**: criar conta nova em `/auth` com e-mail/senha. Confirma que é redirecionado para o dashboard e que o trial mostra 25 dias.
2. **Limites grátis**: cadastrar 25 materiais; o 26º deve bloquear com o pop-up Diamante.
3. **Pagamento (modo teste)**: clicar em "Assinar Diamante" → na tela do Stripe usar **`4242 4242 4242 4242`**, validade qualquer data futura (ex: `12/30`), CVC `123`, CEP qualquer.
4. **Desbloqueio**: voltar ao app — limite de materiais sumiu, páginas `/faturamento`, `/inteligencia`, `/executivo` abrem sem bloqueio. O badge no header passa a mostrar "Diamante ativo".
5. **Perfil**: editar nome do ateliê e WhatsApp; recarregar a página — valores persistem. Mudar e-mail/senha em Segurança.
6. **Cancelar**: Configurações → "Gerenciar assinatura" abre o portal do Stripe em outra aba. Cancelar lá. Voltar ao app — você continua tendo acesso até a data de fim do período (mostrada no banner).
7. **Sair**: botão "Sair da conta" desloga e leva para `/auth`. Logar em outro navegador mostra os mesmos dados (sincronização).

Aprove para eu começar pela Fase 1 (auth + tabelas base). As fases seguintes vou implementando em sequência, mostrando o que mudou em cada passo.