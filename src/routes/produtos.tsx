import { createFileRoute } from "@tanstack/react-router";
import { Plus, Gift } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Lucrando com Papel" }] }),
  component: ProdutosPage,
});

const produtos = [
  { nome: "Convite de aniversário infantil", preco: "R$ 9,80", saude: "ok", margem: "32%" },
  { nome: "Caderno personalizado A5", preco: "R$ 38,00", saude: "alto", margem: "55%" },
  { nome: "Topo de bolo Maternidade", preco: "R$ 24,50", saude: "baixo", margem: "12%" },
  { nome: "Kit Festa Princesa", preco: "R$ 89,00", saude: "ok", margem: "28%" },
  { nome: "Caixa surpresa Páscoa", preco: "R$ 18,00", saude: "ruim", margem: "-5%" },
];

const healthMap: Record<string, { label: string; cls: string }> = {
  ruim: { label: "🔴 Abaixo do custo", cls: "bg-destructive/15 text-destructive" },
  baixo: { label: "🟡 Lucro baixo", cls: "bg-warning/20 text-foreground" },
  ok: { label: "🟢 Saudável", cls: "bg-success/15 text-foreground" },
  alto: { label: "🔵 Preço alto", cls: "bg-chart-4/20 text-foreground" },
};

function ProdutosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Produtos"
        description="Monte fichas técnicas completas com materiais, mão de obra e precificação inteligente."
        actions={
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />

      <Badge className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground mb-6">
        5 / 20 produtos (plano gratuito)
      </Badge>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {produtos.map((p) => {
          const h = healthMap[p.saude];
          return (
            <Card
              key={p.nome}
              className="group rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-accent/40 grid place-items-center">
                <Gift className="h-12 w-12 text-muted-foreground/60" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold leading-tight">{p.nome}</h3>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Preço final</p>
                    <p className="font-display text-2xl font-semibold">{p.preco}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">margem {p.margem}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${h.cls}`}>
                    {h.label}
                  </span>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Editar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
