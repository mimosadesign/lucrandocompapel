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
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useLocalState, brl } from "@/lib/storage";
import type { Produto } from "./produtos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Lucrando com Papel" },
      { name: "description", content: "Visão geral do seu ateliê de papelaria personalizada." },
    ],
  }),
  component: Dashboard,
});

type Pedido = { id: string; valor: number; status: string };

const quickLinks = [
  { to: "/precificacao", label: "Precificação e Custos", icon: Calculator, desc: "Configure suas horas, custos fixos e meta." },
  { to: "/materiais", label: "Materiais", icon: Package, desc: "Cadastre insumos com cálculo de unitário." },
  { to: "/produtos", label: "Produtos", icon: Gift, desc: "Monte fichas técnicas e calcule preço ideal." },
  { to: "/catalogo", label: "Catálogo digital", icon: ShoppingBag, desc: "Vitrine e finalização via WhatsApp." },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList, desc: "Controle prazos, status e entregas." },
  { to: "/faturamento", label: "Faturamento", icon: TrendingUp, desc: "Acompanhe metas e lucro mensal.", diamond: true },
];

function Dashboard() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [valorHora] = useLocalState<number>("lcp:valorHora", 0);

  const faturamento = useMemo(
    () => pedidos.filter((p) => p.status === "Entregue").reduce((s, p) => s + p.valor, 0),
    [pedidos],
  );
  const emAberto = useMemo(
    () => pedidos.filter((p) => p.status !== "Entregue" && p.status !== "Cancelado").length,
    [pedidos],
  );

  const stats = [
    { label: "Faturamento entregue", value: brl(faturamento), hint: faturamento === 0 ? "Sem entregas ainda" : "Soma dos pedidos entregues" },
    { label: "Pedidos em aberto", value: String(emAberto), hint: emAberto === 0 ? "Nenhum pedido pendente" : "A produzir / entregar" },
    { label: "Produtos cadastrados", value: `${produtos.length} / 20`, hint: "Plano gratuito" },
    { label: "Valor da sua hora", value: valorHora > 0 ? brl(valorHora) : "—", hint: valorHora > 0 ? "Definido em Precificação" : "Configure em Precificação" },
  ];

  const vazio = produtos.length === 0 && pedidos.length === 0 && valorHora === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Bem-vinda ✨"
        description="Veja um resumo do seu ateliê e acesse os módulos principais."
        actions={
          <Link to="/pedidos">
            <Button className="rounded-full gap-2">
              <Sparkles className="h-4 w-4" /> Novo pedido
            </Button>
          </Link>
        }
      />

      {vazio ? (
        <Card className="rounded-3xl border-border/60 p-8 text-center shadow-[var(--shadow-card)]">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="font-display text-xl font-semibold">Vamos começar?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece configurando sua precificação, cadastrando materiais e produtos.
            Os números do seu ateliê aparecerão aqui automaticamente.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/precificacao"><Button className="rounded-full">Configurar precificação</Button></Link>
            <Link to="/materiais"><Button variant="outline" className="rounded-full">Cadastrar materiais</Button></Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="rounded-2xl border-border/60 p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </Card>
          ))}
        </div>
      )}

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
