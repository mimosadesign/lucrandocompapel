import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assinar/sucesso")({
  head: () => ({ meta: [{ title: "Pagamento em análise — Lucrando com Papel" }] }),
  component: SucessoPage,
});

function SucessoPage() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="rounded-3xl border-border/60 p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento em análise</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Assim que confirmarmos seu pagamento no WhatsApp, liberamos seu acesso
          Diamante. Costuma levar poucos minutos.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild size="lg" className="rounded-full gap-2">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
