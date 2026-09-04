import { createFileRoute } from "@tanstack/react-router";

/**
 * Retorno automático do Mercado Pago.
 * A notificação só traz o id do pagamento; o valor e o status são sempre
 * conferidos direto na API do Mercado Pago antes de liberar o acesso.
 */
export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = await request.json();
        } catch {
          return new Response("ok");
        }
        const paymentId = body?.data?.id;
        const tipo = body.type ?? body.action ?? "";
        if (!paymentId || !String(tipo).includes("payment")) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin
          .from("payment_settings")
          .select("mercadopago_access_token")
          .eq("id", "default")
          .maybeSingle();
        const token = cfg?.mercadopago_access_token;
        if (!token) return new Response("ok");

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return new Response("ok");
        const pay = (await res.json()) as {
          status?: string;
          external_reference?: string;
          metadata?: { email?: string; plano?: string };
        };

        const ref = pay.external_reference;
        if (!ref) return new Response("ok");
        const { data: pedido } = await supabaseAdmin
          .from("payment_orders")
          .select("id, email, plan, status")
          .eq("id", ref)
          .maybeSingle();
        if (!pedido) return new Response("ok");

        if (pay.status !== "approved") {
          await supabaseAdmin
            .from("payment_orders")
            .update({ status: pay.status ?? "pending", updated_at: new Date().toISOString() })
            .eq("id", pedido.id);
          return new Response("ok");
        }
        if (pedido.status === "approved") return new Response("ok");

        const duration = pedido.plan === "lifetime" ? "lifetime" : pedido.plan === "3m" ? "3m" : "1m";
        let expires_at: string | null = null;
        if (duration !== "lifetime") {
          const d = new Date();
          d.setDate(d.getDate() + (duration === "3m" ? 90 : 30));
          expires_at = d.toISOString();
        }

        await supabaseAdmin.from("lifetime_emails").upsert(
          {
            email: pedido.email.toLowerCase(),
            duration,
            expires_at,
            note: `Mercado Pago · pagamento ${paymentId}`,
          },
          { onConflict: "email" },
        );
        await supabaseAdmin
          .from("payment_orders")
          .update({
            status: "approved",
            provider_ref: String(paymentId),
            updated_at: new Date().toISOString(),
          })
          .eq("id", pedido.id);

        return new Response("ok");
      },
    },
  },
});
