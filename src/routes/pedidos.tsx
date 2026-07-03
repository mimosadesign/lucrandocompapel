import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar, Truck, Trash2, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalState, brl } from "@/lib/storage";
import { MoneyInput } from "@/components/money-input";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Lucrando com Papel" }] }),
  component: PedidosPage,
});

type StatusPedido = "Em aberto" | "Em produção" | "Pronto" | "Entregue" | "Cancelado";

type Pedido = {
  id: string;
  cliente: string;
  produto: string;
  entrega: string;
  entregaTipo: string;
  valor: number;
  valorEntrega: number;
  status: StatusPedido;
};

const statusMap: Record<StatusPedido, string> = {
  "Em aberto": "bg-secondary text-secondary-foreground",
  "Em produção": "bg-chart-4/20 text-foreground",
  "Pronto": "bg-success/20 text-foreground",
  "Entregue": "bg-muted text-muted-foreground",
  "Cancelado": "bg-destructive/15 text-destructive",
};

const STATUS_LIST: StatusPedido[] = ["Em aberto", "Em produção", "Pronto", "Entregue", "Cancelado"];

function PedidosPage() {
  const [pedidos, setPedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);

  const contagens = useMemo(() => {
    const c = { "Em aberto": 0, "Em produção": 0, Pronto: 0, Entregue: 0 };
    for (const p of pedidos) {
      if (p.status === "Em aberto") c["Em aberto"]++;
      else if (p.status === "Em produção") c["Em produção"]++;
      else if (p.status === "Pronto") c.Pronto++;
      else if (p.status === "Entregue") c.Entregue++;
    }
    return c;
  }, [pedidos]);

  function novo() {
    setEditing({
      id: crypto.randomUUID(),
      cliente: "",
      produto: "",
      entrega: "",
      entregaTipo: "Retirada",
      valor: 0,
      valorEntrega: 0,
      status: "Em aberto",
    });
    setOpen(true);
  }
  function editar(p: Pedido) {
    setEditing({ ...p });
    setOpen(true);
  }
  function salvar() {
    if (!editing || !editing.cliente.trim()) return;
    setPedidos((prev) => {
      const i = prev.findIndex((x) => x.id === editing.id);
      if (i === -1) return [...prev, editing];
      const c = [...prev];
      c[i] = editing;
      return c;
    });
    setOpen(false);
  }
  function excluir(id: string) {
    setPedidos((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pedidos"
        description="Controle prazos, pagamentos e entregas do seu ateliê."
        actions={
          <Button className="rounded-full gap-2" onClick={novo}>
            <Plus className="h-4 w-4" /> Novo pedido
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        {[
          { l: "Em aberto", v: contagens["Em aberto"] },
          { l: "Em produção", v: contagens["Em produção"] },
          { l: "Prontos", v: contagens.Pronto },
          { l: "Entregues", v: contagens.Entregue },
        ].map((s) => (
          <Card key={s.l} className="rounded-2xl border-border/60 p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
        {pedidos.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-60" />
            <p className="font-medium">Nenhum pedido registrado ainda.</p>
            <p className="text-sm">Toque em <strong>Novo pedido</strong> para começar.</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
            >
              <div className="md:col-span-3">
                <p className="font-medium">{p.cliente}</p>
                <p className="text-xs text-muted-foreground">{p.produto}</p>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> {p.entrega || "—"}
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" /> {p.entregaTipo}
              </div>
              <div className="md:col-span-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusMap[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                <div className="text-right">
                  <p className="font-display text-lg font-semibold">{brl(p.valor + (p.valorEntrega || 0))}</p>
                  {p.valorEntrega > 0 && (
                    <p className="text-[10px] text-muted-foreground">inclui {brl(p.valorEntrega)} entrega</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => editar(p)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => excluir(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        {pedidos.length} / 20 pedidos no mês (plano gratuito)
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && pedidos.some((x) => x.id === editing.id) ? "Editar pedido" : "Novo pedido"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input
                  value={editing.cliente}
                  onChange={(e) => setEditing({ ...editing, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid gap-2">
                <Label>Produto</Label>
                <Input
                  value={editing.produto}
                  onChange={(e) => setEditing({ ...editing, produto: e.target.value })}
                  placeholder="Descrição do pedido"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Data de entrega</Label>
                  <Input
                    type="date"
                    value={editing.entrega}
                    onChange={(e) => setEditing({ ...editing, entrega: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de entrega</Label>
                  <Select
                    value={editing.entregaTipo}
                    onValueChange={(v) => setEditing({ ...editing, entregaTipo: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retirada">Retirada</SelectItem>
                      <SelectItem value="Motoboy">Motoboy</SelectItem>
                      <SelectItem value="Correios">Correios</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Valor do pedido (R$)</Label>
                  <MoneyInput
                    value={editing.valor}
                    onChange={(n) => setEditing({ ...editing, valor: n })}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor da entrega (R$)</Label>
                  <MoneyInput
                    value={editing.valorEntrega ?? 0}
                    onChange={(n) => setEditing({ ...editing, valorEntrega: n })}
                    placeholder="0,00 (se houver)"
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Total do pedido</span>
                <span className="font-display text-base font-semibold">
                  {brl((editing.valor || 0) + (editing.valorEntrega || 0))}
                </span>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) => setEditing({ ...editing, status: v as StatusPedido })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
