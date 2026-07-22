import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gem, MessageCircle, Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/assinar")({
  head: () => ({
    meta: [
      { title: "Assinar Plano Diamante — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Escolha o plano Diamante do Lucrando com Papel: mensal, trimestral ou vitalício. Pagamento simples via WhatsApp.",
      },
    ],
  }),
  component: AssinarPage,
});

// ⚠️ TROQUE PARA O SEU WHATSAPP (só números, com código do país e DDD, ex: 5511987654321)
const MEU_WHATSAPP = "5511999999999";

type Plano = {
  id: "1m" | "3m" | "lifetime";
  titulo: string;
  preco: string;
  detalhe: string;
  destaque?: string;
  badge?: string;
  msg: string;
};

const beneficios = [
  "Todos os recursos ilimitados",
  "Cores personalizadas do app",
  "Dashboards executivo e financeiro",
  "Inteligência financeira e simuladores",
  "Exportar orçamentos em PDF",
  "Prioridade no atendimento",
];

function AssinarPage() {
  const { user } = useUser();

  const planos: Plano[] = [
    {
      id: "1m",
      titulo: "1 mês",
      preco: "R$ 18,00",
      detalhe: "cobrança única · vale 30 dias",
      msg: "1 mês (R$ 18,00)",
    },
    {
      id: "3m",
      titulo: "3 meses",
      preco: "R$ 36,00",
      detalhe: "R$ 12,00/mês · economize 33%",
      destaque: "Mais escolhido",
      badge: "-33%",
      msg: "3 meses (R$ 36,00)",
    },
    {
      id: "lifetime",
      titulo: "Vitalício",
      preco: "R$ 160,00",
      detalhe: "pagamento único · acesso para sempre",
      destaque: "Melhor custo-benefício",
      msg: "Vitalício (R$ 160,00)",
    },
  ];

  function abrirWhats(plano: Plano) {
    const email = user?.email ? ` Meu e-mail: ${user.email}.` : "";
    const nome = user?.nome ? ` Sou ${user.nome}.` : "";
    const texto = `Olá! Quero assinar o Plano Diamante do Lucrando com Papel — ${plano.msg}.${nome}${email}`;
    const url = `https://wa.me/${MEU_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond mb-3">
          <Gem className="h-7 w-7 text-diamond-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Plano Diamante</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Escolha o plano ideal e finalize o pagamento pelo nosso WhatsApp. Assim que
          confirmarmos, seu acesso é liberado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {planos.map((p) => {
          const highlight = p.id === "3m";
          return (
            <Card
              key={p.id}
              className={`relative flex flex-col rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] ${
                highlight ? "ring-2 ring-primary" : ""
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {p.destaque}
                </span>
              )}
              {p.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-diamond/25 px-2 py-0.5 text-xs font-semibold">
                  {p.badge}
                </span>
              )}
              <h2 className="font-display text-xl font-semibold">{p.titulo}</h2>
              <p className="mt-2 text-3xl font-bold">{p.preco}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.detalhe}</p>

              <Button
                size="lg"
                className="mt-4 w-full rounded-full gap-2"
                onClick={() => abrirWhats(p)}
              >
                <MessageCircle className="h-4 w-4" />
                Quero este plano
              </Button>

              <ul className="mt-5 space-y-2 text-sm">
                {beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 rounded-3xl border-primary/20 bg-primary/5 p-5 text-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">Como funciona</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>Clique em "Quero este plano" — abre nosso WhatsApp com a mensagem pronta.</li>
              <li>Envie o comprovante do pagamento (PIX) por lá.</li>
              <li>Liberamos seu acesso Diamante no app em minutos.</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
