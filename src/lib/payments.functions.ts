import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAILS = new Set<string>(["mimosavacadesign@gmail.com"]);

function assertAdmin(email: string | undefined) {
  const e = email?.toLowerCase();
  if (!e || !ADMIN_EMAILS.has(e)) throw new Response("Forbidden", { status: 403 });
}

export type PlanoId = "1m" | "3m" | "lifetime";

export const PLANOS: Record<PlanoId, { titulo: string; valor: number }> = {
  "1m": { titulo: "Plano Diamante — 1 mês", valor: 18 },
  "3m": { titulo: "Plano Diamante — 3 meses", valor: 36 },
  lifetime: { titulo: "Plano Diamante — Vitalício", valor: 235 },
};

function mask(token: string | null) {
  if (!token) return "";
  if (token.length <= 10) return "••••";
  return `${token.slice(0, 8)}••••${token.slice(-4)}`;
}

/** Configuração vista apenas pela administradora (chave sempre mascarada). */
export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payment_settings")
      .select("provider, mercadopago_enabled, mercadopago_access_token, updated_at")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      provider: (data?.provider ?? "whatsapp") as "whatsapp" | "mercadopago",
      mercadopagoEnabled: !!data?.mercadopago_enabled,
      tokenMascarado: mask(data?.mercadopago_access_token ?? null),
      temToken: !!data?.mercadopago_access_token,
      updatedAt: data?.updated_at ?? null,
    };
  });

export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: "whatsapp" | "mercadopago"; token?: string }) => {
    if (input.provider !== "whatsapp" && input.provider !== "mercadopago") {
      throw new Error("Modo de pagamento inválido");
    }
    return { provider: input.provider, token: (input.token ?? "").trim() };
  })
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = {
      id: "default",
      provider: data.provider,
      mercadopago_enabled: data.provider === "mercadopago",
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };

    if (data.token) {
      // valida a chave antes de salvar
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (!res.ok) throw new Error("Chave do Mercado Pago inválida ou sem permissão.");
      patch['mercadopago_access_token'] = data.token;
    }

    if (data.provider === "mercadopago" && !data.token) {
      const { data: atual } = await supabaseAdmin
        .from("payment_settings")
        .select("mercadopago_access_token")
        .eq("id", "default")
        .maybeSingle();
      if (!atual?.mercadopago_access_token) {
        throw new Error("Informe a chave (Access Token) do Mercado Pago para ativar.");
      }
    }

    const { error } = await supabaseAdmin
      .from("payment_settings")
      .upsert(patch as never, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Usado pela tela de planos: diz apenas se o pagamento online está ligado. */
export const getPaymentMode = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_settings")
    .select("provider, mercadopago_enabled, mercadopago_access_token")
    .eq("id", "default")
    .maybeSingle();
  const online =
    data?.provider === "mercadopago" &&
    !!data?.mercadopago_enabled &&
    !!data?.mercadopago_access_token;
  return { online };
});

/** Cria o link de pagamento do plano no Mercado Pago. */
export const criarPagamentoMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plano: PlanoId; origem?: string }) => {
    if (!PLANOS[input?.plano]) throw new Error("Plano inválido");
    return { plano: input.plano, origem: input.origem ?? "" };
  })
  .handler(async ({ context, data }) => {
    const email = String(context.claims?.['email'] ?? "").toLowerCase();
    if (!email) throw new Error("Faça login para pagar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("payment_settings")
      .select("mercadopago_access_token, mercadopago_enabled, provider")
      .eq("id", "default")
      .maybeSingle();
    const token = cfg?.mercadopago_access_token;
    if (!token || !cfg?.mercadopago_enabled) {
      throw new Error("Pagamento online indisponível no momento.");
    }

    const plano = PLANOS[data.plano];
    const base = data.origem || "https://lucrandocompapel.lovable.app";

    const { data: pedido, error: pedidoErr } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        email,
        plan: data.plano,
        amount: plano.valor,
        provider: "mercadopago",
        status: "pending",
      })
      .select("id")
      .single();
    if (pedidoErr) throw new Error(pedidoErr.message);

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: data.plano,
            title: plano.titulo,
            quantity: 1,
            currency_id: "BRL",
            unit_price: plano.valor,
          },
        ],
        payer: { email },
        external_reference: `${pedido.id}`,
        metadata: { email, plano: data.plano },
        back_urls: {
          success: `${base}/assinar/sucesso`,
          pending: `${base}/assinar/sucesso`,
          failure: `${base}/assinar`,
        },
        auto_return: "approved",
        notification_url: `${base}/api/public/mercadopago`,
      }),
    });

    if (!res.ok) {
      const detalhe = await res.text();
      console.error("mercadopago preference error", detalhe);
      throw new Error("Não foi possível abrir o pagamento. Tente novamente.");
    }
    const pref = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
    await supabaseAdmin
      .from("payment_orders")
      .update({ provider_ref: pref.id, updated_at: new Date().toISOString() })
      .eq("id", pedido.id);

    const url = pref.init_point || pref.sandbox_init_point;
    if (!url) throw new Error("Link de pagamento indisponível.");
    return { url };
  });
