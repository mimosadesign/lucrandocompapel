import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Crown, Cake, Tag, Clock, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Lucrando com Papel" }] }),
  component: ClientesPage,
});

type Pedido = {
  id: string;
  cliente: string;
  produto?: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
  criadoEm?: string;
};

// Dados extras por cliente (chave = nome normalizado)
type ClienteExtra = {
  key: string;
  nome: string;
  whatsapp?: string;
  aniversario?: string; // MM-DD
  etiquetas?: string[];
};

const LIMITE_VIP = 500;
const DIAS_INATIVO = 60;

function normKey(nome: string) {
  return nome.trim().toLowerCase();
}

function ClientesPage() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [extras, setExtras] = useLocalState<ClienteExtra[]>("lcp:clientes:extras", []);
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [editando, setEditando] = useState<ClienteExtra | null>(null);

  const clientes = useMemo(() => {
    const map = new Map<
      string,
      { nome: string; key: string; pedidos: Pedido[]; total: number; ultima?: Date }
    >();
    for (const p of pedidos) {
      const nome = (p.cliente || "").trim();
      if (!nome) continue;
      const key = normKey(nome);
      const item = map.get(key) || { nome, key, pedidos: [], total: 0, ultima: undefined };
      if (p.status !== "Cancelado") {
        item.total += (p.valor || 0) + (p.valorEntrega || 0);
      }
      item.pedidos.push(p);
      const ref = p.entrega || p.criadoEm;
      if (ref) {
        const d = new Date(ref);
        if (!isNaN(d.getTime()) && (!item.ultima || d > item.ultima)) item.ultima = d;
      }
      map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [pedidos]);

  const now = new Date();
  const mesAtual = now.getMonth() + 1;

  const vips = clientes.filter((c) => c.total >= LIMITE_VIP);
  const aniversariantes = extras.filter((e) => {
    if (!e.aniversario) return false;
    const m = parseInt(e.aniversario.slice(0, 2), 10);
    return m === mesAtual;
  });
  const inativos = clientes.filter((c) => {
    if (!c.ultima) return false;
    const dias = Math.floor((now.getTime() - c.ultima.getTime()) / (24 * 60 * 60 * 1000));
    return dias >= DIAS_INATIVO;
  });

  const filtrados = clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  function getExtra(key: string): ClienteExtra {
    return extras.find((e) => e.key === key) || { key, nome: "", etiquetas: [] };
  }
  function salvarExtra() {
    if (!editando) return;
    setExtras((prev) => {
      const i = prev.findIndex((e) => e.key === editando.key);
      if (i === -1) return [...prev, editando];
      const c = [...prev];
      c[i] = editando;
      return c;
    });
    setEditando(null);
  }

  const clienteDetalhe = detalhe ? clientes.find((c) => c.key === detalhe) : null;
  const extraDetalhe = detalhe ? getExtra(detalhe) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Clientes"
        description="Histórico completo, VIPs, aniversariantes, inativos e etiquetas personalizadas."
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Total de clientes" value={String(clientes.length)} />
        <KpiCard icon={<Crown className="h-4 w-4" />} label={`VIPs (≥ ${brl(LIMITE_VIP)})`} value={String(vips.length)} />
        <KpiCard icon={<Cake className="h-4 w-4" />} label="Aniversariantes do mês" value={String(aniversariantes.length)} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label={`Inativos ≥ ${DIAS_INATIVO}d`} value={String(inativos.length)} />
      </div>

      {aniversariantes.length > 0 && (
        <Card className="mb-6 rounded-2xl border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <Cake className="h-4 w-4 text-primary" /> Aniversariantes deste mês
          </p>
          <div className="flex flex-wrap gap-2">
            {aniversariantes.map((a) => (
              <span key={a.key} className="rounded-full bg-background px-3 py-1 text-xs">
                {a.nome} · dia {a.aniversario?.slice(3, 5)}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="h-11 rounded-full"
        />
      </div>

      <Card className="rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)]">
        {filtrados.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-8 w-8 opacity-60" />
            <p className="font-medium">Nenhum cliente ainda.</p>
            <p className="text-sm">Cadastre pedidos para popular seus clientes automaticamente.</p>
          </div>
        ) : (
          filtrados.map((c) => {
            const extra = getExtra(c.key);
            const vip = c.total >= LIMITE_VIP;
            const diasInativo = c.ultima
              ? Math.floor((now.getTime() - c.ultima.getTime()) / (24 * 60 * 60 * 1000))
              : null;
            const inativo = diasInativo !== null && diasInativo >= DIAS_INATIVO;
            return (
              <div
                key={c.key}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-6 py-4 border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <div className="md:col-span-4">
                  <p className="font-medium flex items-center gap-2 flex-wrap">
                    {c.nome}
                    {vip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium">
                        <Crown className="h-3 w-3" /> VIP
                      </span>
                    )}
                    {inativo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        <Clock className="h-3 w-3" /> {diasInativo}d
                      </span>
                    )}
                  </p>
                  {extra.etiquetas && extra.etiquetas.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {extra.etiquetas.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px]">
                          <Tag className="h-2.5 w-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-3 text-sm text-muted-foreground">
                  {c.pedidos.length} pedido(s)
                </div>
                <div className="md:col-span-3 font-display text-lg font-semibold">
                  {brl(c.total)}
                </div>
                <div className="md:col-span-2 flex md:justify-end gap-1">
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setDetalhe(c.key)}>
                    Histórico
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setEditando({ ...extra, nome: c.nome })}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Histórico */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="rounded-3xl sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clienteDetalhe?.nome}</DialogTitle>
          </DialogHeader>
          {clienteDetalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Total gasto</p>
                  <p className="font-display text-lg font-semibold">{brl(clienteDetalhe.total)}</p>
                </div>
                <div className="rounded-2xl bg-secondary/50 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Pedidos</p>
                  <p className="font-display text-lg font-semibold">{clienteDetalhe.pedidos.length}</p>
                </div>
              </div>
              {extraDetalhe?.whatsapp && (
                <p className="text-sm">WhatsApp: <strong>{extraDetalhe.whatsapp}</strong></p>
              )}
              <div>
                <p className="text-sm font-medium mb-2">Histórico de pedidos</p>
                <div className="space-y-2">
                  {clienteDetalhe.pedidos.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/60 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium truncate">{p.produto || "—"}</span>
                        <span className="font-semibold">{brl((p.valor || 0) + (p.valorEntrega || 0))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{p.entrega ? new Date(p.entrega).toLocaleDateString("pt-BR") : "—"}</span>
                        <span>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editar extras */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="grid gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={editando.nome} disabled className="mt-1.5" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={editando.whatsapp || ""}
                  onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Aniversário (DD/MM)</Label>
                <Input
                  value={editando.aniversario ? `${editando.aniversario.slice(3, 5)}/${editando.aniversario.slice(0, 2)}` : ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length >= 4) {
                      const dia = v.slice(0, 2);
                      const mes = v.slice(2, 4);
                      setEditando({ ...editando, aniversario: `${mes}-${dia}` });
                    } else {
                      setEditando({ ...editando, aniversario: undefined });
                    }
                  }}
                  placeholder="Ex: 25/12"
                  className="mt-1.5"
                />
              </div>
              <EtiquetasEditor
                value={editando.etiquetas || []}
                onChange={(t) => setEditando({ ...editando, etiquetas: t })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button className="rounded-full" onClick={salvarExtra}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EtiquetasEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [nova, setNova] = useState("");
  return (
    <div>
      <Label>Etiquetas</Label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Ex: Casamento, Corporativo"
          onKeyDown={(e) => {
            if (e.key === "Enter" && nova.trim()) {
              e.preventDefault();
              if (!value.includes(nova.trim())) onChange([...value, nova.trim()]);
              setNova("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-full gap-1"
          onClick={() => {
            if (nova.trim() && !value.includes(nova.trim())) onChange([...value, nova.trim()]);
            setNova("");
          }}
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </Card>
  );
}
