import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, AlertCircle, Package, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/materiais")({
  head: () => ({ meta: [{ title: "Materiais — Lucrando com Papel" }] }),
  component: MateriaisPage,
});

type Material = {
  id: string;
  nome: string;
  fornecedor: string;
  valorPago: number;
  quantidade: number;
  estoque: number;
  estoqueMinimo: number;
};

const STORAGE_KEY = "lcp:materiais";

function loadMateriais(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Material[]) : [];
  } catch {
    return [];
  }
}

function brl(value: number) {
  if (!isFinite(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);

  useEffect(() => {
    setMateriais(loadMateriais());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materiais));
  }, [materiais]);

  const filtrados = useMemo(
    () =>
      materiais.filter((m) =>
        m.nome.toLowerCase().includes(busca.toLowerCase()),
      ),
    [materiais, busca],
  );

  function abrirNovo() {
    setEditing({
      id: crypto.randomUUID(),
      nome: "",
      fornecedor: "",
      valorPago: 0,
      quantidade: 0,
      estoque: 0,
      estoqueMinimo: 0,
    });
    setOpen(true);
  }

  function abrirEditar(m: Material) {
    setEditing({ ...m });
    setOpen(true);
  }

  function salvar() {
    if (!editing) return;
    if (!editing.nome.trim()) return;
    setMateriais((prev) => {
      const idx = prev.findIndex((p) => p.id === editing.id);
      if (idx === -1) return [...prev, editing];
      const copy = [...prev];
      copy[idx] = editing;
      return copy;
    });
    setOpen(false);
    setEditing(null);
  }

  function excluir(id: string) {
    setMateriais((prev) => prev.filter((p) => p.id !== id));
  }

  const unitarioEditing =
    editing && editing.quantidade > 0
      ? editing.valorPago / editing.quantidade
      : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Materiais"
        description="Cadastre seus insumos com cálculo automático de valor unitário e alerta de estoque."
        actions={
          <Button className="rounded-full gap-2" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Novo material
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar material..."
            className="h-11 rounded-full border-border/70 bg-card pl-11"
          />
        </div>
        <Badge className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">
          {materiais.length} / 25 materiais (plano gratuito)
        </Badge>
      </div>

      <Card className="rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
        {filtrados.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-8 w-8 opacity-60" />
            <p className="font-medium">Nenhum material cadastrado ainda.</p>
            <p className="text-sm">
              Toque em <strong>Novo material</strong> para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-secondary/40 px-6 py-3 text-xs uppercase tracking-wider text-muted-foreground md:grid">
              <div className="col-span-4">Material</div>
              <div className="col-span-2">Valor pago</div>
              <div className="col-span-1">Qtd.</div>
              <div className="col-span-2">Unitário</div>
              <div className="col-span-2">Estoque</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>
            {filtrados.map((m) => {
              const unit = m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
              const status =
                m.estoque <= 0
                  ? "baixo"
                  : m.estoqueMinimo > 0 && m.estoque <= m.estoqueMinimo
                  ? "alerta"
                  : "ok";
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.fornecedor || "Sem fornecedor"}
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2 text-sm">{brl(m.valorPago)}</div>
                  <div className="md:col-span-1 text-sm">{m.quantidade}</div>
                  <div className="md:col-span-2 font-display text-base font-semibold">
                    {brl(unit)}
                  </div>
                  <div className="md:col-span-2">
                    <StockBadge status={status} value={m.estoque} />
                  </div>
                  <div className="md:col-span-1 flex gap-1 md:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => abrirEditar(m)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-destructive"
                      onClick={() => excluir(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing && materiais.some((m) => m.id === editing.id)
                ? "Editar material"
                : "Novo material"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome do material</Label>
                <Input
                  value={editing.nome}
                  onChange={(e) =>
                    setEditing({ ...editing, nome: e.target.value })
                  }
                  placeholder="Ex.: Papel Color Plus A4"
                />
              </div>
              <div className="grid gap-2">
                <Label>Fornecedor</Label>
                <Input
                  value={editing.fornecedor}
                  onChange={(e) =>
                    setEditing({ ...editing, fornecedor: e.target.value })
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Valor pago (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={editing.valorPago || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        valorPago: parseFloat(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade no pacote</Label>
                  <Input
                    inputMode="decimal"
                    value={editing.quantidade || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        quantidade: parseFloat(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Valor unitário: </span>
                <span className="font-display text-base font-semibold">
                  {brl(unitarioEditing)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Estoque atual</Label>
                  <Input
                    inputMode="decimal"
                    value={editing.estoque || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        estoque: parseFloat(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Estoque mínimo</Label>
                  <Input
                    inputMode="decimal"
                    value={editing.estoqueMinimo || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        estoqueMinimo:
                          parseFloat(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="rounded-full" onClick={salvar}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StockBadge({ status, value }: { status: string; value: number }) {
  if (status === "baixo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3 w-3" /> {value} un. — reponha esse item
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
