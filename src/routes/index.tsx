import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  Package,
  Gift,
  ShoppingBag,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Lucrando com Papel" },
      { name: "description", content: "Visão geral do seu ateliê de papelaria personalizada." },
    ],
  }),
  component: Dashboard,
});

const stats = [
  { label: "Faturamento do mês", value: "R$ 4.280,00", hint: "+12% vs mês anterior", tone: "primary" },
  { label: "Pedidos em aberto", value: "8", hint: "2 entregam essa semana", tone: "muted" },
  { label: "Produtos cadastrados", value: "14 / 20", hint: "Plano gratuito", tone: "muted" },
  { label: "Valor da sua hora", value: "R$ 28,50", hint: "Calculado automaticamente", tone: "primary" },
];

const quickLinks = [
  { to: "/precificacao", label: "Precificação e Custos", icon: Calculator, desc: "Configure suas horas, custos fixos e meta." },
  { to: "/materiais", label: "Materiais", icon: Package, desc: "Cadastre insumos com cálculo de unitário." },
  { to: "/produtos", label: "Produtos", icon: Gift, desc: "Monte fichas técnicas e calcule preço ideal." },
  { to: "/catalogo", label: "Catálogo digital", icon: ShoppingBag, desc: "Vitrine e finalização via WhatsApp." },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList, desc: "Controle prazos, status e entregas." },
  { to: "/faturamento", label: "Faturamento", icon: TrendingUp, desc: "Acompanhe metas e lucro mensal.", diamond: true },
];

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Bem-vinda de volta ✨"
        description="Veja um resumo rápido do seu ateliê e acesse os módulos principais."
        actions={
          <Button className="rounded-full gap-2">
            <Sparkles className="h-4 w-4" />
            Novo pedido
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-card)]"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p
              className={`mt-2 font-display text-2xl font-semibold ${
                s.tone === "primary" ? "text-foreground" : "text-foreground"
              }`}
            >
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">Atalhos</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="group h-full rounded-2xl border-border/60 p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-foreground">
                  <q.icon className="h-5 w-5" />
                </div>
                {q.diamond && (
                  <span className="rounded-full bg-diamond/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    💎 Diamante
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{q.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                Acessar <ArrowRight className="h-3 w-3" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
