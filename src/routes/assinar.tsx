import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Gem } from "lucide-react";
import { useEffect } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { useUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export const Route = createFileRoute("/assinar")({
  head: () => ({ meta: [{ title: "Assinar Plano Diamante — Lucrando com Papel" }] }),
  component: AssinarPage,
});

function TestBanner() {
  if (!clientToken) return null;
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-foreground">
        Ambiente de teste — use o cartão <strong>4242 4242 4242 4242</strong>, validade futura, CVC qualquer.
      </div>
    );
  }
  return null;
}

function AssinarPage() {
  const { user, ready } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", replace: true });
  }, [ready, user, navigate]);

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId: "diamante_28_mensal",
        returnUrl: `${window.location.origin}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Não foi possível iniciar a sessão de pagamento.");
    return result.clientSecret;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond">
            <Gem className="h-6 w-6 text-diamond-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Plano Diamante</h1>
            <p className="text-sm text-muted-foreground">R$ 35,00/mês · cobrança mensal recorrente</p>
          </div>
        </div>

        <TestBanner />

        {!clientToken ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-foreground">
            Pagamentos ainda não estão configurados para este ambiente.
          </div>
        ) : !user ? (
          <div className="rounded-2xl bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
            Carregando sessão...
          </div>
        ) : (
          <div id="checkout" className="rounded-2xl overflow-hidden border border-border/60">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </Card>
    </div>
  );
}
