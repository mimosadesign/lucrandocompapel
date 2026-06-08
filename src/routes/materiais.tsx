import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, AlertCircle, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/materiais")({
  head: () => ({ meta: [{ title: "Materiais — Lucrando com Papel" }] }),
  component: MateriaisPage,
});

const materiais = [
  { nome: "Papel Color Plus A4", pacote: "R$ 48,00", unid: 50, unitario: "R$ 1,01", estoque: 32, status: "ok" },
  { nome: "Vinil adesivo recortado", pacote: "R$ 120,00", unid: 10, unitario: "R$ 13,20", estoque: 3, status: "baixo" },
  { nome: "Fita de cetim 10mm", pacote: "R$ 22,00", unid: 100, unitario: "R$ 0,23", estoque: 78, status: "ok" },
  { nome: "Caixa kraft 12x12", pacote: "R$ 85,00", unid: 25, unitario: "R$ 3,57", estoque: 8, status: "alerta" },
];

function MateriaisPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Materiais"
        description="Cadastre seus insumos com cálculo automático de valor unitário, perda e alerta de estoque."
        actions={
          <Button className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> Novo material
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar material..." className="h-11 rounded-full border-border/70 bg-card pl-11" />
        </div>
        <Badge className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">
          4 / 45 materiais (plano gratuito)
        </Badge>
      </div>

      <Card className="rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-secondary/40 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground md:grid">
          <div className="col-span-4">Material</div>
          <div className="col-span-2">Valor pago</div>
          <div className="col-span-1">Qtd.</div>
          <div className="col-span-2">Unitário</div>
          <div className="col-span-2">Estoque</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>
        {materiais.map((m) => (
          <div
            key={m.nome}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
          >
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{m.nome}</p>
                <p className="text-xs text-muted-foreground">Fornecedor principal</p>
              </div>
            </div>
            <div className="md:col-span-2 text-sm">{m.pacote}</div>
            <div className="md:col-span-1 text-sm">{m.unid}</div>
            <div className="md:col-span-2 font-display text-base font-semibold">{m.unitario}</div>
            <div className="md:col-span-2">
              <StockBadge status={m.status} value={m.estoque} />
            </div>
            <div className="md:col-span-1 flex md:justify-end">
              <Button variant="ghost" size="sm" className="rounded-full">
                Editar
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function StockBadge({ status, value }: { status: string; value: number }) {
  if (status === "baixo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3 w-3" /> {value} un. — falta logo
      </span>
    );
  if (status === "alerta")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium text-foreground">
        ⚠️ {value} un.
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-foreground">
      ✓ {value} un.
    </span>
  );
}
