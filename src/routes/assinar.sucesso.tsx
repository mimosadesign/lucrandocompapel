import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Gem, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEntitlement } from "@/lib/auth";

export const Route = createFileRoute("/assinar/sucesso")({
  head: () => ({ meta: [{ title: "Assinatura confirmada — Lucrando com Papel" }] }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: SucessoPage,
});

function SucessoPage() {
  const { isPaid, ready } = useEntitlement();
  const [waited, setWaited] = useState(0);

  // Mostramos um spinner curto enquanto o webhook chega.
  useEffect(() => {
    if (isPaid) return;
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, [isPaid]);

  const stillWaiting = ready && !isPaid && waited < 20;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="rounded-3xl border-border/60 p-10 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond">
          <Gem className="h-8 w-8 text-diamond-foreground" />
        </div>
        {isPaid ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Assinatura confirmada!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bem-vinda ao Plano Diamante 💎. Todos os recursos ilimitados já estão liberados no seu ateliê.
            </p>
          </>
        ) : stillWaiting ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Confirmando seu pagamento...</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Isso costuma levar alguns segundos. Não feche essa página.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento recebido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se a liberação não aparecer em instantes, atualize a página. Caso persista, entre em contato.
            </p>
          </>
        )}
        <Link to="/" className="mt-6 inline-block">
          <Button size="lg" className="rounded-full">Ir para o início</Button>
        </Link>
      </Card>
    </div>
  );
}
