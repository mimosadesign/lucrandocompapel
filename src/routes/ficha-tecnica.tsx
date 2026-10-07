import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/ficha-tecnica")({
  head: () => ({
    meta: [
      { title: "Ficha Técnica do Produto — Lucrando com Papel" },
      { name: "description", content: "Monte a ficha técnica de cada produto com materiais, tempo, custo, preço e lucro." },
      { property: "og:title", content: "Ficha Técnica do Produto — Lucrando com Papel" },
      { property: "og:description", content: "Monte a ficha técnica de cada produto com materiais, tempo, custo, preço e lucro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Item = { id: string; nome: string; quantidade: string; custo: number };
type Ficha = { id: string; nome: string; rendimento: string; minutos: number; itens: Item[]; margem: number };

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Ficha Técnica do Produto" diamond description="Tudo que vai em cada produto: materiais, impressão, embalagem, tempo, custo, preço sugerido e lucro. Duplique para criar variações." />
      <DiamondLock title="A receita completa de cada produto" description="Fichas técnicas com custo, preço sugerido e lucro, prontas para duplicar em variações." preview={<Conteudo />} />
    </div>
  );
}

function Conteudo() {
  const [fichas, setFichas] = useLocalState<Ficha[]>("lcp:fichasTecnicas", []);
  const [valorHora] = useLocalState<number>("lcp:valorHora", 0);
  const upd = (f: Ficha) => setFichas((p) => p.map((x) => (x.id === f.id ? f : x)));
  const nova = () => setFichas((p) => [{ id: crypto.randomUUID(), nome: "Novo produto", rendimento: "", minutos: 0, itens: [], margem: 50 }, ...p]);

  return (
    <div className="space-y-4">
      <Button className="rounded-full gap-2" onClick={nova}><Plus className="h-4 w-4" /> Nova ficha</Button>
      {valorHora <= 0 && <p className="text-xs text-muted-foreground">Sua hora de trabalho ainda não foi configurada em Precificação e Custos — a mão de obra não entra no custo até lá.</p>}
      {fichas.length === 0 && <Card className="rounded-3xl p-6 text-sm text-muted-foreground">Nenhuma ficha ainda. Ex.: “Caixa Milk — 20 unidades”.</Card>}
      {fichas.map((f) => {
        const materiais = f.itens.reduce((s, i) => s + (i.custo || 0), 0);
        const mao = valorHora * (f.minutos / 60);
        const custo = materiais + mao;
        const preco = f.margem < 100 ? custo / (1 - f.margem / 100) : 0;
        return (
          <Card key={f.id} className="rounded-3xl p-5 space-y-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
              <div><Label>Produto</Label><Input value={f.nome} onChange={(e) => upd({ ...f, nome: e.target.value })} /></div>
              <div><Label>Rendimento</Label><Input value={f.rendimento} placeholder="20 unidades" onChange={(e) => upd({ ...f, rendimento: e.target.value })} /></div>
              <div><Label>Tempo (min)</Label><Input type="number" min={0} value={f.minutos || ""} onChange={(e) => upd({ ...f, minutos: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" aria-label="Duplicar ficha" onClick={() => setFichas((p) => [{ ...f, id: crypto.randomUUID(), nome: f.nome + " (variação)", itens: f.itens.map((i) => ({ ...i, id: crypto.randomUUID() })) }, ...p])}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir ficha" onClick={() => setFichas((p) => p.filter((x) => x.id !== f.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              {f.itens.map((i) => (
                <div key={i.id} className="grid gap-2 grid-cols-[2fr_1fr_1fr_auto]">
                  <Input placeholder="Papel, impressão, fita, cola, embalagem…" value={i.nome} onChange={(e) => upd({ ...f, itens: f.itens.map((x) => (x.id === i.id ? { ...x, nome: e.target.value } : x)) })} />
                  <Input placeholder="12 folhas" value={i.quantidade} onChange={(e) => upd({ ...f, itens: f.itens.map((x) => (x.id === i.id ? { ...x, quantidade: e.target.value } : x)) })} />
                  <MoneyInput value={i.custo} onChange={(n) => upd({ ...f, itens: f.itens.map((x) => (x.id === i.id ? { ...x, custo: n } : x)) })} placeholder="Custo" />
                  <Button size="icon" variant="ghost" aria-label="Remover item" onClick={() => upd({ ...f, itens: f.itens.filter((x) => x.id !== i.id) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => upd({ ...f, itens: [...f.itens, { id: crypto.randomUUID(), nome: "", quantidade: "", custo: 0 }] })}>+ Item</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 text-sm items-end">
              <div><Label>Margem (%)</Label><Input type="number" min={0} max={95} value={f.margem} onChange={(e) => upd({ ...f, margem: Math.min(95, Math.max(0, Number(e.target.value))) })} /></div>
              <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Tempo</p><p className="font-semibold">{Math.floor(f.minutos / 60)}h{String(f.minutos % 60).padStart(2, "0")}</p></div>
              <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Custo total</p><p className="font-semibold">{brl(custo)}</p></div>
              <div className="rounded-2xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Preço sugerido</p><p className="font-semibold">{brl(preco)}</p></div>
              <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Lucro</p><p className="font-semibold">{brl(preco - custo)}</p></div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
