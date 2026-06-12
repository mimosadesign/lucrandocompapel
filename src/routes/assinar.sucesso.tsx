import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Gem } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assinar/sucesso")({
  head: () => ({ meta: [{ title: "Assinatura confirmada — Lucrando com Papel" }] }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: SucessoPage,
});

function SucessoPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="rounded-3xl border-border/60 p-10 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond">
          <Gem className="h-8 w-8 text-diamond-foreground" />
        </div>
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Assinatura confirmada!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bem-vinda ao Plano Diamante 💎. Todos os recursos ilimitados já estão liberados no seu ateliê.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button size="lg" className="rounded-full">Ir para o início</Button>
        </Link>
      </Card>
    </div>
  );
}
