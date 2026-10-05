import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Copy, FileDown, Pencil, Plus, Share2, Trash2, ArrowLeft, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/tabela-precos")({
  head: () => ({
    meta: [
      { title: "Tabela de Preços — Lucrando com Papel" },
      { name: "description", content: "Monte tabelas de preços para qualquer produto e envie em PDF ao cliente." },
      { property: "og:title", content: "Tabela de Preços — Lucrando com Papel" },
      { property: "og:description", content: "Monte tabelas de preços para qualquer produto e envie em PDF ao cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TabelaPrecosPage,
});

/** Lista aberta: novas opções podem ser adicionadas aqui no futuro. */
export const TIPOS_ESPECIFICACAO = [
  "Gramatura",
  "Metragem",
  "Material",
  "Acabamento",
  "Espessura",
  "Cor",
  "Personalizado",
];

type Linha = {
  id: string;
  produto: string;
  tamanho: string;
  especTipo: string;
  especValor: string;
  quantidade: string;
  valor: number;
};
type Tabela = { id: string; nome: string; linhas: Linha[]; atualizadaEm: string };

const novaLinha = (base?: Partial<Linha>): Linha => ({
  id: crypto.randomUUID(),
  produto: "",
  tamanho: "",
  especTipo: "Gramatura",
  especValor: "",
  quantidade: "",
  valor: 0,
  ...base,
});

const espec = (l: Linha) => (l.especValor ? `${l.especTipo}: ${l.especValor}` : "—");

function TabelaPrecosPage() {
  const [tabelas, setTabelas] = useLocalState<Tabela[]>("lcp:tabelasPrecos", []);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [ver, setVer] = useState(false);
  const aberta = tabelas.find((t) => t.id === abertaId) || null;

  function salvarTabela(t: Tabela) {
    setTabelas((prev) => prev.map((x) => (x.id === t.id ? { ...t, atualizadaEm: new Date().toISOString() } : x)));
  }
  function criar() {
    const t: Tabela = { id: crypto.randomUUID(), nome: "Nova tabela", linhas: [novaLinha()], atualizadaEm: new Date().toISOString() };
    setTabelas((p) => [t, ...p]);
    setAbertaId(t.id);
    setVer(false);
  }
  function duplicar(t: Tabela) {
    const c: Tabela = {
      ...t,
      id: crypto.randomUUID(),
      nome: `${t.nome} (cópia)`,
      linhas: t.linhas.map((l) => ({ ...l, id: crypto.randomUUID() })),
      atualizadaEm: new Date().toISOString(),
    };
    setTabelas((p) => [c, ...p]);
    toast.success("Tabela duplicada.");
  }
  function excluir(t: Tabela) {
    if (!confirm(`Excluir a tabela "${t.nome}"?`)) return;
    setTabelas((p) => p.filter((x) => x.id !== t.id));
    if (abertaId === t.id) setAbertaId(null);
  }

  if (aberta) {
    return (
      <div className="mx-auto max-w-5xl">
        <button onClick={() => setAbertaId(null)} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Minhas tabelas
        </button>
        {ver ? (
          <Visualizar tabela={aberta} onEditar={() => setVer(false)} />
        ) : (
          <Editor tabela={aberta} onChange={salvarTabela} onVer={() => setVer(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tabela de Preços"
        description="Crie tabelas para qualquer produto, com tamanho, especificação, quantidade e valor — e envie em PDF ao cliente."
        actions={
          <Button className="rounded-full gap-2" onClick={criar}>
            <Plus className="h-4 w-4" /> Nova tabela
          </Button>
        }
      />
      {tabelas.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Você ainda não tem tabelas. Toque em <b>Nova tabela</b> para começar.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tabelas.map((t) => (
            <Card key={t.id} className="rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)]">
              <p className="font-display text-lg font-semibold">{t.nome}</p>
              <p className="text-xs text-muted-foreground">
                {t.linhas.length} linha{t.linhas.length === 1 ? "" : "s"} · atualizada em{" "}
                {new Date(t.atualizadaEm).toLocaleDateString("pt-BR")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => { setAbertaId(t.id); setVer(true); }}>
                  <Eye className="h-3.5 w-3.5" /> Ver
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => { setAbertaId(t.id); setVer(false); }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => duplicar(t)}>
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full gap-1 text-destructive" onClick={() => excluir(t)}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ tabela, onChange, onVer }: { tabela: Tabela; onChange: (t: Tabela) => void; onVer: () => void }) {
  const set = (linhas: Linha[]) => onChange({ ...tabela, linhas });
  const upd = (id: string, patch: Partial<Linha>) =>
    set(tabela.linhas.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          className="max-w-md font-display text-lg"
          value={tabela.nome}
          onChange={(e) => onChange({ ...tabela, nome: e.target.value })}
          placeholder="Nome da tabela"
        />
        <Button variant="outline" className="rounded-full gap-2" onClick={onVer}>
          <Eye className="h-4 w-4" /> Visualizar e compartilhar
        </Button>
      </div>
      <div className="space-y-3">
        {tabela.linhas.map((l, i) => (
          <Card key={l.id} className="rounded-2xl border-border/60 p-3">
            <div className="grid gap-2 grid-cols-2 md:grid-cols-[1.4fr_1fr_0.9fr_1fr_0.8fr_0.9fr]">
              <Input className="col-span-2 md:col-span-1" placeholder="Produto" value={l.produto} onChange={(e) => upd(l.id, { produto: e.target.value })} />
              <Input placeholder="Tamanho (ex.: 10x14 cm)" value={l.tamanho} onChange={(e) => upd(l.id, { tamanho: e.target.value })} />
              <select aria-label="Tipo de especificação" className={sel} value={l.especTipo} onChange={(e) => upd(l.id, { especTipo: e.target.value })}>
                {TIPOS_ESPECIFICACAO.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <Input placeholder="Especificação (ex.: 90g)" value={l.especValor} onChange={(e) => upd(l.id, { especValor: e.target.value })} />
              <Input inputMode="numeric" placeholder="Qtd." value={l.quantidade} onChange={(e) => upd(l.id, { quantidade: e.target.value })} />
              <MoneyInput placeholder="Valor R$" value={l.valor} onChange={(n) => upd(l.id, { valor: n })} />
            </div>
            <div className="mt-2 flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => {
                const c = [...tabela.linhas];
                c.splice(i + 1, 0, { ...l, id: crypto.randomUUID() });
                set(c);
              }}>
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => set(tabela.linhas.filter((x) => x.id !== l.id))}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Button
        className="mt-4 w-full rounded-full gap-2 sm:w-auto"
        onClick={() => {
          const ult = tabela.linhas[tabela.linhas.length - 1];
          set([...tabela.linhas, novaLinha(ult ? { produto: ult.produto, tamanho: ult.tamanho, especTipo: ult.especTipo } : {})]);
        }}
      >
        <Plus className="h-4 w-4" /> Adicionar linha
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Tudo é salvo automaticamente. A nova linha já vem com o produto e tamanho da anterior.</p>
    </div>
  );
}

function Visualizar({ tabela, onEditar }: { tabela: Tabela; onEditar: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-semibold">{tabela.nome}</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full gap-2" onClick={onEditar}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button className="rounded-full gap-2" onClick={() => setAberto(true)}>
            <Share2 className="h-4 w-4" /> Compartilhar Tabela
          </Button>
        </div>
      </div>
      <Card className="overflow-x-auto rounded-3xl border-border/60 shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-primary/10 text-left">
            <tr>
              {["Produto", "Tamanho", "Especificação", "Quantidade", "Valor"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.linhas.map((l) => (
              <tr key={l.id} className="border-t border-border/60">
                <td className="px-4 py-2.5">{l.produto || "—"}</td>
                <td className="px-4 py-2.5">{l.tamanho || "—"}</td>
                <td className="px-4 py-2.5">{espec(l)}</td>
                <td className="px-4 py-2.5">{l.quantidade || "—"}</td>
                <td className="px-4 py-2.5 font-semibold">{brl(l.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <CompartilharDialog open={aberto} onOpenChange={setAberto} tabela={tabela} />
    </div>
  );
}

function CompartilharDialog({ open, onOpenChange, tabela }: { open: boolean; onOpenChange: (b: boolean) => void; tabela: Tabela }) {
  const { user } = useUser();
  const [logo] = useLocalState<string>("lcp:logo", "");
  const [cliente, setCliente] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [obs, setObs] = useState("");
  const [validade, setValidade] = useState("");

  async function gerar(compartilhar: boolean) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mx = 40;
    let y = 40;
    const atelie = user?.profile?.nome_atelier || user?.nome || "Meu Ateliê";
    if (logo) {
      try {
        doc.addImage(logo, mx, y, 56, 56);
      } catch { /* logo inválida */ }
    }
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(40, 40, 40);
    doc.text(atelie, mx + (logo ? 68 : 0), y + 22);
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(110, 110, 110);
    doc.text(tabela.nome, mx + (logo ? 68 : 0), y + 40);
    y += 76;
    if (cliente) { doc.setTextColor(40, 40, 40).text(`Cliente: ${cliente}`, mx, y); y += 16; }
    if (validade) { doc.text(`Válida até: ${new Date(`${validade}T12:00`).toLocaleDateString("pt-BR")}`, mx, y); y += 16; }
    if (mensagem) {
      const ls = doc.splitTextToSize(mensagem, W - mx * 2);
      doc.setTextColor(60, 60, 60).text(ls, mx, y + 4);
      y += ls.length * 14 + 8;
    }
    y += 8;
    const cols = [{ h: "Produto", w: 0.26 }, { h: "Tamanho", w: 0.16 }, { h: "Especificação", w: 0.26 }, { h: "Quantidade", w: 0.14 }, { h: "Valor", w: 0.18 }];
    const tw = W - mx * 2;
    const header = () => {
      doc.setFillColor(232, 120, 150).rect(mx, y, tw, 24, "F");
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(255, 255, 255);
      let x = mx + 8;
      cols.forEach((c) => { doc.text(c.h, x, y + 16); x += c.w * tw; });
      y += 24;
      doc.setFont("helvetica", "normal").setTextColor(40, 40, 40);
    };
    header();
    tabela.linhas.forEach((l, i) => {
      if (y > H - 80) { doc.addPage(); y = 40; header(); }
      if (i % 2) doc.setFillColor(248, 244, 246).rect(mx, y, tw, 22, "F");
      const vals = [l.produto || "—", l.tamanho || "—", espec(l), l.quantidade || "—", brl(l.valor)];
      let x = mx + 8;
      vals.forEach((v, k) => {
        doc.text(doc.splitTextToSize(String(v), cols[k].w * tw - 10)[0], x, y + 15);
        x += cols[k].w * tw;
      });
      y += 22;
    });
    if (obs) {
      y += 18;
      doc.setFont("helvetica", "bold").text("Observações", mx, y);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(obs, tw), mx, y + 16);
    }
    doc.setFontSize(8).setTextColor(150, 150, 150).text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · ${atelie}`, mx, H - 24);

    const nomeArq = `${tabela.nome.replace(/[^\w\- ]+/g, "")}.pdf`;
    const blob = doc.output("blob");
    const file = new File([blob], nomeArq, { type: "application/pdf" });
    if (compartilhar && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: tabela.nome, text: mensagem || tabela.nome });
        return;
      } catch { /* cancelado */ }
    }
    doc.save(nomeArq);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Tabela</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Todos os campos são opcionais.</p>
        <div className="space-y-2">
          <Input placeholder="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Textarea placeholder="Mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          <Textarea placeholder="Observação" value={obs} onChange={(e) => setObs(e.target.value)} />
          <label className="block text-xs text-muted-foreground">Validade da tabela</label>
          <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button className="rounded-full gap-2" onClick={() => gerar(true)}>
            <Share2 className="h-4 w-4" /> Enviar PDF
          </Button>
          <Button variant="outline" className="rounded-full gap-2" onClick={() => gerar(false)}>
            <FileDown className="h-4 w-4" /> Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
