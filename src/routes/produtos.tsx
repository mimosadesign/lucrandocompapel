import { createFileRoute } from "@tanstack/react-router";
import { Plus, Gift, Trash2, ImagePlus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocalState, brl } from "@/lib/storage";
import { MoneyInput } from "@/components/money-input";
import { useIsUnlimited } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Lucrando com Papel" }] }),
  component: ProdutosPage,
});

export type Produto = {
  id: string;
  nome: string;
  custo: number;
  margemPct: number;
  foto?: string;
};

async function resizePhoto(file: File, max = 900): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ProdutosPage() {
  const [produtos, setProdutos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const unlimited = useIsUnlimited();

  function novo() {
    setEditing({ id: crypto.randomUUID(), nome: "", custo: 0, margemPct: 0 });
    setOpen(true);
  }
  function editar(p: Produto) {
    setEditing({ ...p });
    setOpen(true);
  }
  function salvar() {
    if (!editing || !editing.nome.trim()) return;
    const isNew = !produtos.some((x) => x.id === editing.id);
    if (isNew && produtos.length >= 15 && !unlimited) {
      toast.error("Limite do plano gratuito atingido (15 produtos). Assine o Diamante para cadastrar ilimitados.");
      return;
    }
    setProdutos((prev) => {
      const i = prev.findIndex((x) => x.id === editing.id);
      if (i === -1) return [...prev, editing];
      const c = [...prev];
      c[i] = editing;
      return c;
    });
    setOpen(false);
  }
  function excluir(id: string) {
    setProdutos((p) => p.filter((x) => x.id !== id));
  }

  const precoEditing = useMemo(() => {
    if (!editing) return 0;
    return editing.custo * (1 + editing.margemPct / 100);
  }, [editing]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Produtos"
        description="Cadastre seus produtos com custo, margem e preço final calculado automaticamente."
        actions={
          <Button className="rounded-full gap-2" onClick={novo}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />

      <Badge className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground mb-6">
        {produtos.length} / 15 produtos (plano gratuito · ilimitado no Diamante)
      </Badge>

      {produtos.length === 0 ? (
        <Card className="rounded-3xl border-border/60 p-10 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          <Gift className="mx-auto mb-3 h-8 w-8 opacity-60" />
          <p className="font-medium">Nenhum produto cadastrado ainda.</p>
          <p className="text-sm">Toque em <strong>Novo produto</strong> para começar.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((p) => {
            const preco = p.custo * (1 + p.margemPct / 100);
            const saude =
              p.margemPct <= 0
                ? { label: "🔴 Abaixo do custo", cls: "bg-destructive/15 text-destructive" }
                : p.margemPct < 20
                ? { label: "🟡 Lucro baixo", cls: "bg-warning/20 text-foreground" }
                : p.margemPct < 50
                ? { label: "🟢 Saudável", cls: "bg-success/15 text-foreground" }
                : { label: "🔵 Preço alto", cls: "bg-chart-4/20 text-foreground" };
            return (
              <Card
                key={p.id}
                className="group rounded-3xl border-border/60 overflow-hidden shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-accent/40 grid place-items-center overflow-hidden">
                  {p.foto ? (
                    <img src={p.foto} alt={p.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Gift className="h-12 w-12 text-muted-foreground/60" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight">{p.nome}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Preço final</p>
                      <p className="font-display text-2xl font-semibold">{brl(preco)}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">margem {p.margemPct}%</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${saude.cls}`}>
                      {saude.label}
                    </span>
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
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && produtos.some((x) => x.id === editing.id) ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome do produto</Label>
                <Input
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex.: Convite de aniversário"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Custo total (R$)</Label>
                  <MoneyInput
                    value={editing.custo}
                    onChange={(n) => setEditing({ ...editing, custo: n })}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Margem de lucro (%)</Label>
                  <MoneyInput
                    value={editing.margemPct}
                    onChange={(n) => setEditing({ ...editing, margemPct: n })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Preço final sugerido: </span>
                <span className="font-display text-base font-semibold">{brl(precoEditing)}</span>
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
