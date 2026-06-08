import { createFileRoute } from "@tanstack/react-router";
import { Plus, Bell, Calendar, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Lucrando com Papel" }] }),
  component: PedidosPage,
});

const pedidos = [
  { cliente: "Marina S.", produto: "Kit festa Princesa", entrega: "12/06", status: "Em produção", valor: "R$ 89,00", entregaTipo: "Motoboy" },
  { cliente: "Joana M.", produto: "Cadernos personalizados (5)", entrega: "08/06", status: "Pronto", valor: "R$ 190,00", entregaTipo: "Retirada" },
  { cliente: "Bia L.", produto: "Convite aniversário", entrega: "15/06", status: "Em aberto", valor: "R$ 120,00", entregaTipo: "Correios" },
  { cliente: "Carla P.", produto: "Topo de bolo", entrega: "07/06", status: "Entregue", valor: "R$ 24,50", entregaTipo: "Retirada" },
];

const statusMap: Record<string, string> = {
  "Em aberto": "bg-secondary text-secondary-foreground",
  "Em produção": "bg-chart-4/20 text-foreground",
  "Pronto": "bg-success/20 text-foreground",
  "Entregue": "bg-muted text-muted-foreground",
  "Cancelado": "bg-destructive/15 text-destructive",
};

function PedidosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pedidos"
        description="Controle prazos, pagamentos e entregas. Receba alertas sonoros antes do vencimento."
        actions={
          <>
            <Button variant="outline" className="rounded-full border-foreground/20 gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </Button>
            <Button className="rounded-full gap-2">
              <Plus className="h-4 w-4" /> Novo pedido
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        {[
          { l: "Em aberto", v: 4 },
          { l: "Em produção", v: 3 },
          { l: "Prontos", v: 2 },
          { l: "Entregues no mês", v: 12 },
        ].map((s) => (
          <Card key={s.l} className="rounded-2xl border-border/60 p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
        {pedidos.map((p) => (
          <div
            key={p.cliente + p.produto}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
          >
            <div className="md:col-span-3">
              <p className="font-medium">{p.cliente}</p>
              <p className="text-xs text-muted-foreground">{p.produto}</p>
            </div>
            <div className="md:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" /> Entrega {p.entrega}
            </div>
            <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" /> {p.entregaTipo}
            </div>
            <div className="md:col-span-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusMap[p.status]}`}>
                {p.status}
              </span>
            </div>
            <div className="md:col-span-2 md:text-right">
              <p className="font-display text-lg font-semibold">{p.valor}</p>
            </div>
          </div>
        ))}
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        4 / 20 pedidos no mês (plano gratuito)
      </p>
    </div>
  );
}
