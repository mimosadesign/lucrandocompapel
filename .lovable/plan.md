# Plano de implementação

Escopo confirmado: **nada de integrações externas pagas**. Toda cobrança acontece via WhatsApp manual e você libera pelo admin. Todas as features que exigiriam WhatsApp Business API, Twilio, OpenAI, mapas pagos, push notifications nativos, etc. **saem da lista** ou viram versão manual (link `wa.me`, cálculo local, sem IA de verdade).

Vou fazer em **4 ondas**. Cada onda é um deploy testável. Você aprova esta rodada = eu executo a Onda 1 agora e as próximas ondas em mensagens seguintes.

---

## Onda 1 — Cobrança manual + limites + mensagens (AGORA)

### 1. Substituir Stripe por cobrança manual via WhatsApp
- Remover fluxo Stripe checkout do app (rota `/assinar`, componentes de embed, webhook, `payments.functions.ts`, `stripe.ts`, `stripe.server.ts`, dependências `@stripe/*`).
- Criar nova página `/assinar` com 3 cards de plano:
  - **1 mês — R$ 18,00** (só R$ 0,60/dia)
  - **3 meses — R$ 36,00** (R$ 12,00/mês — economize 33%)
  - **Vitalício — R$ 160,00** (paga uma vez, usa pra sempre)
- Cada card tem botão "Quero este plano" que abre WhatsApp seu (`5511...`) com mensagem pré-pronta: "Olá! Quero assinar o plano [X] do Lucrando com Papel. Meu e-mail cadastrado é: [email]"
- Configurável: número WhatsApp da dona (você) em constante no código, ou campo no admin.

### 2. Admin: presentear qualquer duração
- Migração: adicionar `expires_at timestamptz` na tabela `lifetime_emails` (renomear conceito internamente para "granted_access", mantendo compatibilidade).
- Server functions novas: `grantAccess(email, duration: '1m' | '3m' | 'lifetime', note)`, mantém `revokeLifetimeAccess`.
- UI admin: 3 botões "Presentear 1 mês", "Presentear 3 meses", "Presentear vitalício" (por linha do usuário e na seção de gift avulso).
- Lista de presenteados mostra vencimento (ou "Vitalício").
- `useEntitlement` passa a considerar grants com vencimento futuro.

### 3. Mensagens de limite claras
- Em **Orçamentos**: banner topo — "Grátis: 36 orçamentos/mês (renovam dia 1º). PDF ilimitado. Diamante: tudo ilimitado."
- Em **Precificar item**: mesmo banner — 36/mês grátis, ilimitado Diamante.
- Em **Pedidos**: banner — "Grátis: 20 pedidos/mês (renovam dia 1º). Diamante: ilimitado."
- Contador visível de "X de Y usados este mês" em cada tela.
- Bloqueio real no submit quando estoura o limite (já existe pra pedidos, replicar padrão nos outros).

### 4. Limpeza
- Remover env vars Stripe do `.env.development` e `.env.production`.
- Remover banner de "modo teste Stripe".
- Página `/assinar/sucesso` vira página simples de "pagamento em análise — assim que confirmarmos, liberamos seu acesso".

---

## Onda 2 — Duplicar, tags, cliente, dashboards existentes turbinados

- Duplicar produto, orçamento, pedido (botão em cada item).
- Ficha do cliente: histórico completo, total gasto, cliente VIP automático (>R$500), inativo há X dias, aniversariantes do mês.
- Etiquetas personalizadas para clientes.
- Pedidos: adicionar cidade + estado por cliente (para mapa manual futuro).
- Cofre de fórmulas (salvar receitas de produto e aplicar).
- Cronômetro de produção (start/stop, salva tempo real, usa na próxima precificação).
- Histórico de preços dos produtos.
- Ranking de categorias mais lucrativas, melhor dia/mês pra vender, lucro líquido vs bruto, meta diária, evolução anual.
- Datas comemorativas + agenda de datas dos clientes (calendário local).
- Sistema de conquistas + níveis Bronze/Prata/Ouro/Diamante.
- Modo escuro.
- Modo férias.

## Onda 3 — Estoque, planejamento, calculadoras

- Estoque inteligente: sugestão de compra, "quanto ainda consigo produzir", custo médio automático, histórico de variação, alertas de aumento.
- Baixa automática no estoque conforme pedido avança.
- Centro de Produção: gera lista de materiais, ordem de corte, checklist de montagem, tempo estimado.
- Planejamento inteligente de produção (cronograma automático baseado em pedidos + horário de trabalho).
- Calculadoras: parcelamento (Mercado Pago), caixa (PIX/dinheiro/cartão/fiado), reajuste em massa, simulador de meta, simulador de kits, "Vale a pena?", modo feirão.
- Lista de compras compartilhável (link `wa.me` com texto pronto).
- Painel Saúde do Ateliê (nota 0-100 baseada em indicadores locais).
- "Posso aceitar esse pedido?" — análise 100% local (estoque, prazo, margem, agenda).
- Calculadora de risco de pedido.
- Índice de dependência (produto/cliente que concentra faturamento).

## Onda 4 — Exportação, gamificação, "IA" local, extras

- Exportação Excel, CSV, PDF completo. Backup/restore JSON local.
- Multiusuário e permissões (dentro do mesmo login, perfis internos: Dona, Funcionária, Vendedora — permissão por tela).
- Comissão por vendedor.
- Registro de atividades.
- "IA" heurística (sem API paga): auditoria de produtos mal precificados, sugestão de reajuste, produtos encalhados, sugestão de kits por co-ocorrência, radar de oportunidades, "Copiloto do Ateliê" (resumo diário calculado localmente ao abrir o app), Consultora semanal.
- Currículo do ateliê + Antes/Depois.
- Clube VIP + Clube de Clientes.
- Lista de desejos com metas de economia.
- Dinheiro perdido, quanto custa ficar parado.
- Alerta de cliente arriscado.

### O que sai da lista (exige integração paga)
- Envio automático real de WhatsApp (só faremos link `wa.me` clicável).
- Push/lembretes fora do app (widget de celular, notificações nativas).
- IA de verdade (OpenAI/Anthropic). O que chamamos de "IA" acima são regras heurísticas em cima dos dados locais.
- Mapa de clientes/entregas com mapa visual (só lista agrupada por cidade/bairro).
- Comparação com concorrência.
- Backup na nuvem "de verdade" (fica como export/import JSON).

---

## Como testar a Onda 1 no preview

1. **Nova cobrança WhatsApp**
   - Abra `/assinar` → clique em cada um dos 3 planos → deve abrir WhatsApp com mensagem pronta.
2. **Admin presenteia**
   - Logue com `mimosavacadesign@gmail.com` → `/admin` → digite um email cadastrado no sistema → botão "Presentear 1 mês" → sair, logar com aquele email → deve ter Diamante liberado por 30 dias.
   - Repita com "3 meses" e "Vitalício" pra confirmar que cada duração respeita a data de expiração.
3. **Limites**
   - Em conta grátis (sem trial), crie 20 pedidos → o 21º deve ser bloqueado com mensagem "Limite mensal atingido. Renova dia 1º ou assine Diamante."
   - Idem para 36 orçamentos e 36 precificações.
4. **Banners**
   - Confirme que os banners de limite aparecem no topo de Orçamentos, Precificar item e Pedidos.

---

## Notas técnicas
- Enquanto Stripe estava ativo, o Lovable Cloud gerou tabela `subscriptions` com dados. Vou **manter a tabela** (não drop) pra não perder histórico, mas o app deixa de escrever nela. `useEntitlement` passa a olhar só `lifetime_emails` (agora com `expires_at`) + trial de 25 dias.
- Remoção de pacotes: `@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe` (do server).
- Migração SQL: `alter table lifetime_emails add column expires_at timestamptz null; add column duration text not null default 'lifetime';`
- Feature-flag interna `PAYMENT_MODE = 'whatsapp'` pra deixar reversível.

Confirma que posso executar a **Onda 1 agora**? Assim que você aprovar, mando as próximas ondas em sequência.