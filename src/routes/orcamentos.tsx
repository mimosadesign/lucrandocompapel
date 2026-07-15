import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, FileDown, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";
import { useUser, useEntitlement } from "@/lib/auth";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Lucrando com Papel" }] }),
  component: OrcamentosPage,
});

type OrcItem = {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
};

type Orcamento = {
  id: string;
  numero: string;
  cliente: string;
  clienteWhats: string;
  observacoes: string;
  entrega: number;
  desconto: number;
  itens: OrcItem[];
  chavePix: string;
  criadoEm: string;
};

function novoOrcamento(chavePixPadrao: string, numeroSugerido: string): Orcamento {
  return {
    id: crypto.randomUUID(),
    numero: numeroSugerido,
    cliente: "",
    clienteWhats: "",
    observacoes: "",
    entrega: 0,
    desconto: 0,
    itens: [],
    chavePix: chavePixPadrao,
    criadoEm: new Date().toISOString(),
  };
}

function OrcamentosPage() {
  const { user } = useUser();
  const { isUnlimited } = useEntitlement();
  const [chavePixPadrao, setChavePixPadrao] = useLocalState<string>(
    "lcp:chavePix",
    "",
  );
  const [logo] = useLocalState<string>("lcp:logo", "");
  const [salvos, setSalvos] = useLocalState<Orcamento[]>("lcp:orcamentos", []);
  const [lastReset, setLastReset] = useLocalState<string>(
    "lcp:orcamentos:lastReset",
    "",
  );

  // Plano gratuito: no dia 1º do novo mês, remove orçamentos de meses anteriores
  // para liberar novamente o limite de 20/mês.
  useEffect(() => {
    if (isUnlimited) return;
    const now = new Date();
    const chave = `${now.getFullYear()}-${now.getMonth()}`;
    if (lastReset === chave) return;
    setSalvos((prev) =>
      prev.filter((o) => {
        const d = new Date(o.criadoEm);
        if (isNaN(d.getTime())) return true;
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    );
    setLastReset(chave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlimited, lastReset]);

  const orcamentosMesAtual = useMemo(() => {
    const now = new Date();
    return salvos.filter((o) => {
      const d = new Date(o.criadoEm);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [salvos]);

  const limiteAtingido = !isUnlimited && orcamentosMesAtual >= 20;

  const numeroSugerido = useMemo(
    () => String(1000 + salvos.length + 1),
    [salvos.length],
  );

  const [orc, setOrc] = useState<Orcamento>(() =>
    novoOrcamento(chavePixPadrao, numeroSugerido),
  );

  useEffect(() => {
    // se ainda não personalizou a chave no orçamento, herda a padrão
    if (!orc.chavePix && chavePixPadrao) {
      setOrc((o) => ({ ...o, chavePix: chavePixPadrao }));
    }
  }, [chavePixPadrao]);

  const subtotal = orc.itens.reduce(
    (s, i) => s + i.quantidade * i.valorUnit,
    0,
  );
  const total = Math.max(0, subtotal + (orc.entrega || 0) - (orc.desconto || 0));

  function addItem() {
    setOrc({
      ...orc,
      itens: [
        ...orc.itens,
        { id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnit: 0 },
      ],
    });
  }
  function updateItem(id: string, patch: Partial<OrcItem>) {
    setOrc({
      ...orc,
      itens: orc.itens.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }
  function removeItem(id: string) {
    setOrc({ ...orc, itens: orc.itens.filter((x) => x.id !== id) });
  }

  function salvar() {
    if (!orc.cliente.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (orc.itens.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    const idx = salvos.findIndex((s) => s.id === orc.id);
    const isNovo = idx === -1;
    if (isNovo && limiteAtingido) {
      toast.error(
        "Limite de 20 orçamentos no mês (plano gratuito). Reseta automaticamente no dia 1º do próximo mês. Assine o Diamante para ilimitado.",
      );
      return;
    }
    const prox = [...salvos];
    if (isNovo) prox.unshift(orc);
    else prox[idx] = orc;
    setSalvos(prox);
    if (orc.chavePix && orc.chavePix !== chavePixPadrao) {
      setChavePixPadrao(orc.chavePix);
    }
    toast.success("Orçamento salvo!");
  }

  function novo() {
    setOrc(novoOrcamento(chavePixPadrao, String(1000 + salvos.length + 1)));
  }
  function carregar(o: Orcamento) {
    setOrc({ ...o });
  }
  function duplicar(o: Orcamento) {
    setOrc({
      ...o,
      id: crypto.randomUUID(),
      numero: String(1000 + salvos.length + 1),
      criadoEm: new Date().toISOString(),
    });
    toast.success("Orçamento duplicado — ajuste e salve.");
  }
  function excluir(id: string) {
    setSalvos(salvos.filter((s) => s.id !== id));
  }

  async function loadLogoImage(): Promise<HTMLImageElement | null> {
    if (!logo) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = logo;
    });
  }

  async function exportarPDF() {
    if (orc.itens.length === 0) {
      toast.error("Adicione pelo menos um item antes de exportar.");
      return;
    }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 40;

    const nomeAtelier = user?.profile?.nome_atelier || user?.nome || "Meu Ateliê";
    const whats = user?.profile?.whatsapp || "";

    // Cabeçalho
    const img = await loadLogoImage();
    if (img) {
      try {
        doc.addImage(img, "PNG", marginX, y, 60, 60);
      } catch {
        /* ignore image errors */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(nomeAtelier, marginX + (img ? 72 : 0), y + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (whats) doc.text(`WhatsApp: ${whats}`, marginX + (img ? 72 : 0), y + 40);
    doc.text(
      `Orçamento nº ${orc.numero}`,
      pageW - marginX,
      y + 22,
      { align: "right" },
    );
    doc.text(
      new Date(orc.criadoEm).toLocaleDateString("pt-BR"),
      pageW - marginX,
      y + 40,
      { align: "right" },
    );
    y += 90;

    doc.setDrawColor(220);
    doc.line(marginX, y, pageW - marginX, y);
    y += 20;

    // Cliente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cliente", marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(orc.cliente || "-", marginX + 60, y);
    y += 16;
    if (orc.clienteWhats) {
      doc.setFont("helvetica", "bold");
      doc.text("WhatsApp", marginX, y);
      doc.setFont("helvetica", "normal");
      doc.text(orc.clienteWhats, marginX + 60, y);
      y += 16;
    }
    y += 6;

    // Tabela de itens
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y, pageW - marginX * 2, 22, "F");
    doc.text("Descrição", marginX + 8, y + 15);
    doc.text("Qtd", pageW - marginX - 210, y + 15, { align: "right" });
    doc.text("Unitário", pageW - marginX - 110, y + 15, { align: "right" });
    doc.text("Subtotal", pageW - marginX - 8, y + 15, { align: "right" });
    y += 26;
    doc.setFont("helvetica", "normal");

    orc.itens.forEach((it) => {
      const desc = it.descricao || "-";
      const wrapped = doc.splitTextToSize(desc, pageW - marginX * 2 - 260);
      const rowH = Math.max(18, wrapped.length * 14 + 4);
      if (y + rowH > 780) {
        doc.addPage();
        y = 60;
      }
      doc.text(wrapped, marginX + 8, y + 12);
      doc.text(String(it.quantidade), pageW - marginX - 210, y + 12, {
        align: "right",
      });
      doc.text(brl(it.valorUnit), pageW - marginX - 110, y + 12, {
        align: "right",
      });
      doc.text(brl(it.quantidade * it.valorUnit), pageW - marginX - 8, y + 12, {
        align: "right",
      });
      y += rowH;
      doc.setDrawColor(235);
      doc.line(marginX, y, pageW - marginX, y);
      y += 6;
    });

    y += 6;
    const somaLinha = (label: string, val: string, bold = false) => {
      if (bold) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.text(label, pageW - marginX - 130, y);
      doc.text(val, pageW - marginX - 8, y, { align: "right" });
      y += 16;
    };
    somaLinha("Subtotal", brl(subtotal));
    if (orc.entrega) somaLinha("Entrega", brl(orc.entrega));
    if (orc.desconto) somaLinha("Desconto", `- ${brl(orc.desconto)}`);
    doc.setFontSize(13);
    somaLinha("Total", brl(total), true);
    doc.setFontSize(10);
    y += 8;

    if (orc.chavePix) {
      doc.setFont("helvetica", "bold");
      doc.text("Chave Pix para pagamento", marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.text(orc.chavePix, marginX, y);
      y += 20;
    }
    if (orc.observacoes) {
      doc.setFont("helvetica", "bold");
      doc.text("Observações", marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const obs = doc.splitTextToSize(orc.observacoes, pageW - marginX * 2);
      doc.text(obs, marginX, y);
    }

    doc.save(
      `orcamento-${orc.numero}-${(orc.cliente || "cliente")
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`,
    );
    toast.success("PDF gerado!");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Monte orçamentos para seus clientes com produtos, quantidade, entrega e chave Pix, e baixe em PDF com sua logo."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2" onClick={exportarPDF}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="outline" className="rounded-full gap-2" onClick={novo}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </div>
        }
      />

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="font-display text-lg font-semibold">
            Orçamento nº {orc.numero}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            <Input
              value={orc.cliente}
              onChange={(e) => setOrc({ ...orc, cliente: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>WhatsApp do cliente</Label>
            <Input
              value={orc.clienteWhats}
              onChange={(e) => setOrc({ ...orc, clienteWhats: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-lg font-semibold">Produtos do orçamento</h2>
        <div className="space-y-3">
          {orc.itens.map((it) => (
            <div
              key={it.id}
              className="grid gap-3 sm:grid-cols-[1fr_100px_140px_140px_40px] items-end"
            >
              <div className="grid gap-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={it.descricao}
                  placeholder="Ex.: Convite personalizado"
                  onChange={(e) => updateItem(it.id, { descricao: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Qtd</Label>
                <MoneyInput
                  value={it.quantidade}
                  onChange={(n) => updateItem(it.id, { quantidade: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Valor unitário</Label>
                <MoneyInput
                  value={it.valorUnit}
                  onChange={(n) => updateItem(it.id, { valorUnit: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Subtotal</Label>
                <div className="h-10 rounded-md border border-border/60 bg-secondary/40 px-3 flex items-center text-sm font-medium">
                  {brl(it.quantidade * it.valorUnit)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => removeItem(it.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="rounded-full gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" /> Adicionar produto
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Valor da entrega</Label>
            <MoneyInput
              value={orc.entrega}
              onChange={(n) => setOrc({ ...orc, entrega: n })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Desconto</Label>
            <MoneyInput
              value={orc.desconto}
              onChange={(n) => setOrc({ ...orc, desconto: n })}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Chave Pix</Label>
            <Input
              value={orc.chavePix}
              onChange={(e) => setOrc({ ...orc, chavePix: e.target.value })}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
            <p className="text-xs text-muted-foreground">
              Aparece no PDF para o cliente pagar. Fica salva como padrão para os
              próximos orçamentos.
            </p>
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={orc.observacoes}
              onChange={(e) => setOrc({ ...orc, observacoes: e.target.value })}
              placeholder="Prazo de produção, condições, etc."
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 p-5">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{brl(subtotal)}</span>
          </div>
          {orc.entrega > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Entrega</span>
              <span>{brl(orc.entrega)}</span>
            </div>
          )}
          {orc.desconto > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Desconto</span>
              <span>- {brl(orc.desconto)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-primary/30 pt-2">
            <span className="font-display text-lg font-semibold">Total</span>
            <span className="font-display text-2xl font-semibold text-primary">
              {brl(total)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="rounded-full gap-2" onClick={exportarPDF}>
            <FileDown className="h-4 w-4" /> Baixar PDF
          </Button>
          <Button size="lg" className="rounded-full gap-2 px-8" onClick={salvar}>
            <Save className="h-4 w-4" /> Salvar orçamento
          </Button>
        </div>
      </Card>

      {salvos.length > 0 && (
        <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Orçamentos salvos
          </h2>
          <div className="space-y-2">
            {salvos.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    #{s.numero} · {s.cliente || "Sem cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.itens.length} itens ·{" "}
                    {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => carregar(s)}>
                    Abrir
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicar(s)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => excluir(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
