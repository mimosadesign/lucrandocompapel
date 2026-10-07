import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Compras e Fornecedores — Lucrando com Papel" },
      { name: "description", content: "Cadastre fornecedores, materiais fornecidos e compare preços pagos." },
      { property: "og:title", content: "Compras e Fornecedores — Lucrando com Papel" },
      { property: "og:description", content: "Cadastre fornecedores, materiais fornecidos e compare preços pagos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Compra = { id: string; data: string; material: string; preco: number };
type Fornecedor = { id: string; nome: string; contato: string; materiais: string; compras: Compra[] };

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Compras e Fornecedores" diamond description="Saiba quem vende cada material, quanto você pagou da última vez e qual foi o melhor preço já encontrado." />
      <DiamondLock title="Compre melhor, lucre mais" description="Registre fornecedores e compras para comparar preços e nunca pagar caro de novo." preview={<Conteudo />} />
    </div>
  );
}

function Conteudo() {
  const [lista, setLista] = useLocalState<Fornecedor[]>("lcp:fornecedores", []);
  const [novo, setNovo] = useState({ nome: "", contato: "", materiais: "" });

  function add() {
    if (!novo.nome.trim()) return;
    setLista((p) => [{ id: crypto.randomUUID(), ...novo, compras: [] }, ...p]);
    setNovo({ nome: "", contato: "", materiais: "" });
  }
  const upd = (f: Fornecedor) => setLista((p) => p.map((x) => (x.id === f.id ? f : x)));

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 grid gap-3 md:grid-cols-4 items-end">
        <div><Label>Nome</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
        <div><Label>Contato</Label><Input value={novo.contato} placeholder="WhatsApp, e-mail, site" onChange={(e) => setNovo({ ...novo, contato: e.target.value })} /></div>
        <div><Label>Materiais fornecidos</Label><Input value={novo.materiais} placeholder="Papel, fita, cola" onChange={(e) => setNovo({ ...novo, materiais: e.target.value })} /></div>
        <Button className="rounded-full gap-2" onClick={add}><Plus className="h-4 w-4" /> Adicionar</Button>
      </Card>
      {lista.length === 0 && <Card className="rounded-3xl p-6 text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda.</Card>}
      {lista.map((f) => <FornecedorCard key={f.id} f={f} onChange={upd} onDelete={() => setLista((p) => p.filter((x) => x.id !== f.id))} />)}
    </div>
  );
}

function FornecedorCard({ f, onChange, onDelete }: { f: Fornecedor; onChange: (f: Fornecedor) => void; onDelete: () => void }) {
  const [c, setC] = useState({ material: "", preco: 0, data: new Date().toISOString().slice(0, 10) });
  const ordenadas = [...f.compras].sort((a, b) => b.data.localeCompare(a.data));
  const ultima = ordenadas[0];
  const melhor = f.compras.length ? f.compras.reduce((m, x) => (x.preco < m.preco ? x : m)) : null;

  return (
    <Card className="rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />{f.nome}</p>
          <p className="text-xs text-muted-foreground">{f.contato || "Sem contato"} · {f.materiais || "Materiais não informados"}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir fornecedor"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
        <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Último preço pago</p><p className="font-semibold">{ultima ? `${brl(ultima.preco)} · ${ultima.material}` : "—"}</p></div>
        <div className="rounded-2xl bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Melhor preço já encontrado</p><p className="font-semibold">{melhor ? `${brl(melhor.preco)} · ${melhor.material}` : "—"}</p></div>
        <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Data da última compra</p><p className="font-semibold">{ultima ? new Date(ultima.data + "T12:00").toLocaleDateString("pt-BR") : "—"}</p></div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4 items-end">
        <Input placeholder="Material comprado" value={c.material} onChange={(e) => setC({ ...c, material: e.target.value })} />
        <MoneyInput value={c.preco} onChange={(n) => setC({ ...c, preco: n })} placeholder="Preço pago" />
        <Input type="date" value={c.data} onChange={(e) => setC({ ...c, data: e.target.value })} />
        <Button variant="outline" className="rounded-full" onClick={() => {
          if (!c.material.trim() || c.preco <= 0) return;
          onChange({ ...f, compras: [...f.compras, { id: crypto.randomUUID(), ...c }] });
          setC({ ...c, material: "", preco: 0 });
        }}>Registrar compra</Button>
      </div>
    </Card>
  );
}
