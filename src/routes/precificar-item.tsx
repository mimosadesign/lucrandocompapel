import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Scissors,
  Layers,
  Package,
  Clock,
  Calculator,
  Printer,
  FileDown,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";
import { useEntitlement, openDiamondDialog } from "@/lib/auth";

export const Route = createFileRoute("/precificar-item")({
  head: () => ({ meta: [{ title: "Precificar Item — Lucrando com Papel" }] }),
  component: PrecificarItemPage,
});

const FREE_LIMIT = 15;

type Material = {
  id: string;
  nome: string;
  valorPago: number;
  quantidade: number;
};

type ItemMaterial = {
  id: string;
  materialId: string;
  quantidade: number;
};

type PrecItem = {
  id: string;
  nome: string;
  minutos: number;
  materiais: ItemMaterial[];
  // máquina de corte
  folhasUsadas: number;
  minutosCorte: number;
  // impressão
  paginasImpressas: number;
  // tesoura (corte manual)
  usaTesoura: boolean;
  cortesManuais: number;
};

type MaquinaCfg = {
  valorBase: number;
  folhasPorBase: number;
  valorLamina: number;
  vidaLaminaMeses: number;
  horasCorteMes: number;
};

type ImpressaoCfg = {
  valorKit: number;
  paginasPorKit: number;
};

type TesouraCfg = {
  valorTesoura: number;
  vidaUtilCortes: number; // quantidade de cortes até trocar
  custoAfiacao: number;
  cortesEntreAfiacoes: number;
};

function loadMateriais(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("lcp:materiais");
    return raw ? (JSON.parse(raw) as Material[]) : [];
  } catch {
    return [];
  }
}

function novoItem(): PrecItem {
  return {
    id: crypto.randomUUID(),
    nome: "",
    minutos: 0,
    materiais: [],
    folhasUsadas: 0,
    minutosCorte: 0,
    paginasImpressas: 0,
    usaTesoura: false,
    cortesManuais: 0,
  };
}

function PrecificarItemPage() {
  const { isUnlimited } = useEntitlement();

  const [materiais, setMateriais] = useState<Material[]>([]);
  useEffect(() => {
    setMateriais(loadMateriais());
    const onStorage = () => setMateriais(loadMateriais());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [valorHora] = useLocalState<number>("lcp:valorHora", 0);

  const [maquina, setMaquina] = useLocalState<MaquinaCfg>("lcp:maquina", {
    valorBase: 0,
    folhasPorBase: 0,
    valorLamina: 0,
    vidaLaminaMeses: 0,
    horasCorteMes: 0,
  });

  const [impressao, setImpressao] = useLocalState<ImpressaoCfg>("lcp:impressao", {
    valorKit: 0,
    paginasPorKit: 0,
  });

  const [tesoura, setTesoura] = useLocalState<TesouraCfg>("lcp:tesoura", {
    valorTesoura: 0,
    vidaUtilCortes: 0,
    custoAfiacao: 0,
    cortesEntreAfiacoes: 0,
  });

  const [item, setItem] = useLocalState<PrecItem>("lcp:precItem:atual", novoItem());
  const [salvos, setSalvos] = useLocalState<PrecItem[]>("lcp:precItens", []);

  // ==== Cálculos ====
  const custoBasePorFolha =
    maquina.folhasPorBase > 0 ? maquina.valorBase / maquina.folhasPorBase : 0;
  const custoLaminaMes =
    maquina.vidaLaminaMeses > 0 ? maquina.valorLamina / maquina.vidaLaminaMeses : 0;
  const custoLaminaHora =
    maquina.horasCorteMes > 0 ? custoLaminaMes / maquina.horasCorteMes : 0;

  const custoTintaPagina =
    impressao.paginasPorKit > 0 ? impressao.valorKit / impressao.paginasPorKit : 0;

  const custoTrocaTesouraPorCorte =
    tesoura.vidaUtilCortes > 0 ? tesoura.valorTesoura / tesoura.vidaUtilCortes : 0;
  const custoAfiacaoPorCorte =
    tesoura.cortesEntreAfiacoes > 0
      ? tesoura.custoAfiacao / tesoura.cortesEntreAfiacoes
      : 0;
  const custoTesouraPorCorte = custoTrocaTesouraPorCorte + custoAfiacaoPorCorte;

  const custoMateriais = useMemo(() => {
    return item.materiais.reduce((sum, im) => {
      const m = materiais.find((x) => x.id === im.materialId);
      if (!m) return sum;
      const unit = m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
      return sum + unit * im.quantidade;
    }, 0);
  }, [item.materiais, materiais]);

  const custoMaoDeObra = (valorHora / 60) * item.minutos;
  const custoBaseCorte = custoBasePorFolha * item.folhasUsadas;
  const custoLaminaItem = (custoLaminaHora / 60) * item.minutosCorte;
  const custoMaquinaTotal = custoBaseCorte + custoLaminaItem;

  const custoImpressaoItem = custoTintaPagina * item.paginasImpressas;
  const custoTesouraItem = custoTesouraPorCorte * item.cortesManuais;

  const custoTotal =
    custoMateriais +
    custoMaoDeObra +
    custoMaquinaTotal +
    custoImpressaoItem +
    custoTesouraItem;

  // ==== Ações ====
  function addMaterial() {
    setItem({
      ...item,
      materiais: [
        ...item.materiais,
        { id: crypto.randomUUID(), materialId: "", quantidade: 1 },
      ],
    });
  }
  function removeMaterial(id: string) {
    setItem({ ...item, materiais: item.materiais.filter((x) => x.id !== id) });
  }
  function updateMat(id: string, patch: Partial<ItemMaterial>) {
    setItem({
      ...item,
      materiais: item.materiais.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }

  function salvar() {
    if (!item.nome.trim()) {
      toast.error("Dê um nome ao item antes de salvar.");
      return;
    }
    const existe = salvos.findIndex((s) => s.id === item.id);
    if (existe === -1 && !isUnlimited && salvos.length >= FREE_LIMIT) {
      toast.error(
        `Plano gratuito permite ${FREE_LIMIT} itens. Assine o Diamante para itens ilimitados.`,
      );
      openDiamondDialog();
      return;
    }
    const proximo = [...salvos];
    if (existe === -1) proximo.push(item);
    else proximo[existe] = item;
    setSalvos(proximo);
    toast.success("Precificação salva! Comece um novo item ou abra um da lista abaixo.");
    // libera o formulário para o próximo item (evita a impressão de que só cabe um)
    setItem(novoItem());
  }
  function reset() {
    setItem(novoItem());
  }
  function carregar(s: PrecItem) {
    setItem({ ...s });
  }
  function excluirSalvo(id: string) {
    setSalvos(salvos.filter((s) => s.id !== id));
  }

  function exportarPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    let y = 50;
    const lineH = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Precificação do item", marginX, y);
    y += lineH * 1.4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Item: ${item.nome || "Sem nome"}`, marginX, y);
    y += lineH;
    doc.text(
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      marginX,
      y,
    );
    y += lineH * 1.4;

    const linhas: Array<[string, string]> = [
      ["Materiais", brl(custoMateriais)],
      [
        `Mão de obra (${item.minutos} min · ${brl(valorHora)}/h)`,
        brl(custoMaoDeObra),
      ],
      [
        `Base de corte (${item.folhasUsadas} folhas)`,
        brl(custoBaseCorte),
      ],
      [
        `Lâmina (${item.minutosCorte} min)`,
        brl(custoLaminaItem),
      ],
      [
        `Impressão (${item.paginasImpressas} páginas)`,
        brl(custoImpressaoItem),
      ],
    ];
    if (item.cortesManuais > 0) {
      linhas.push([
        `Tesoura / corte manual (${item.cortesManuais} cortes)`,
        brl(custoTesouraItem),
      ]);
    }

    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento", marginX, y);
    y += lineH;
    doc.setFont("helvetica", "normal");
    linhas.forEach(([k, v]) => {
      doc.text(k, marginX, y);
      doc.text(v, 555, y, { align: "right" });
      y += lineH;
    });

    y += lineH * 0.4;
    doc.setDrawColor(180);
    doc.line(marginX, y, 555, y);
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Custo total do item", marginX, y);
    doc.text(brl(custoTotal), 555, y, { align: "right" });

    doc.save(`precificacao-${(item.nome || "item").replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("PDF gerado!");
  }

  const podeCriarMais = isUnlimited || salvos.length < FREE_LIMIT;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Precificar Item"
        description={`Calcule o custo real de um produto somando materiais, mão de obra, máquina, impressão e corte manual. Plano gratuito permite ${FREE_LIMIT} itens · Diamante ilimitado.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2" onClick={exportarPDF}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-full gap-2"
              onClick={reset}
              disabled={!podeCriarMais}
              title={!podeCriarMais ? "Limite do plano gratuito atingido" : ""}
            >
              <Plus className="h-4 w-4" /> Novo item
            </Button>
          </div>
        }
      />

      {!isUnlimited && (
        <Card className="rounded-2xl border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          {salvos.length}/{FREE_LIMIT} itens salvos no plano gratuito.{" "}
          <button
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={openDiamondDialog}
          >
            Liberar ilimitado com o Diamante
          </button>
        </Card>
      )}

      {valorHora <= 0 && (
        <Card className="rounded-2xl border-warning/40 bg-warning/10 p-4 text-sm">
          Configure sua <strong>Precificação e Custos</strong> primeiro para calcular o
          valor da sua hora automaticamente.
        </Card>
      )}

      {/* ==== Dados do item ==== */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Calculator className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Dados do item</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Nome do item</Label>
            <Input
              value={item.nome}
              placeholder="Ex.: Convite de 15 anos"
              onChange={(e) => setItem({ ...item, nome: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Minutos de produção (mão de obra)</Label>
            <MoneyInput
              value={item.minutos}
              onChange={(n) => setItem({ ...item, minutos: n })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Vinculado ao valor da hora ({brl(valorHora)}/h) definido em Precificação e Custos.
            </p>
          </div>
        </div>
      </Card>

      {/* ==== Materiais ==== */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Package className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Materiais usados</h2>
        </div>

        {materiais.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum material cadastrado. Cadastre em <strong>Materiais</strong> primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            {item.materiais.map((im) => {
              const m = materiais.find((x) => x.id === im.materialId);
              const unit = m && m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
              const sub = unit * im.quantidade;
              return (
                <div
                  key={im.id}
                  className="grid gap-3 sm:grid-cols-[1fr_140px_140px_40px] items-end"
                >
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Material</Label>
                    <Select
                      value={im.materialId}
                      onValueChange={(v) => updateMat(im.id, { materialId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {materiais.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Quantidade usada</Label>
                    <MoneyInput
                      value={im.quantidade}
                      onChange={(n) => updateMat(im.id, { quantidade: n })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Subtotal</Label>
                    <div className="h-10 rounded-md border border-border/60 bg-secondary/40 px-3 flex items-center text-sm font-medium">
                      {brl(sub)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeMaterial(im.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" className="rounded-full gap-2" onClick={addMaterial}>
              <Plus className="h-4 w-4" /> Adicionar material
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Custo total de materiais
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{brl(custoMateriais)}</p>
        </div>
      </Card>

      {/* ==== Corte: máquina x tesoura ==== */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Scissors className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Custo de corte</h2>
        </div>

        <Tabs defaultValue="maquina">
          <TabsList className="mb-4">
            <TabsTrigger value="maquina" className="gap-2">
              <Layers className="h-4 w-4" /> Máquina de corte
            </TabsTrigger>
            <TabsTrigger value="tesoura" className="gap-2">
              <Wrench className="h-4 w-4" /> Tesoura / manual
            </TabsTrigger>
          </TabsList>

          {/* -------- MÁQUINA -------- */}
          <TabsContent value="maquina" className="space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers className="h-4 w-4" /> Base de corte
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>Valor da base de corte (R$)</Label>
                  <MoneyInput
                    value={maquina.valorBase}
                    onChange={(n) => setMaquina({ ...maquina, valorBase: n })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Quantidade de folhas por base</Label>
                  <MoneyInput
                    value={maquina.folhasPorBase}
                    onChange={(n) => setMaquina({ ...maquina, folhasPorBase: n })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Custo da base por folha</Label>
                  <div className="h-11 rounded-md border border-primary/30 bg-primary/10 px-3 flex items-center font-display text-base font-semibold">
                    {brl(custoBasePorFolha)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Scissors className="h-4 w-4" /> Lâmina de corte
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label>Valor da lâmina (R$)</Label>
                  <MoneyInput
                    value={maquina.valorLamina}
                    onChange={(n) => setMaquina({ ...maquina, valorLamina: n })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vida útil da lâmina (meses)</Label>
                  <MoneyInput
                    value={maquina.vidaLaminaMeses}
                    onChange={(n) => setMaquina({ ...maquina, vidaLaminaMeses: n })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tempo de corte por mês (horas)</Label>
                  <MoneyInput
                    value={maquina.horasCorteMes}
                    onChange={(n) => setMaquina({ ...maquina, horasCorteMes: n })}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Linha label="Custo da lâmina por mês" value={brl(custoLaminaMes)} />
                <Linha label="Custo de corte da lâmina por hora" value={brl(custoLaminaHora)} />
              </div>
            </div>

            <div className="border-t border-border/60 pt-5">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Uso da máquina neste item
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Quantos cortes/folhas para este produto</Label>
                  <MoneyInput
                    value={item.folhasUsadas}
                    onChange={(n) => setItem({ ...item, folhasUsadas: n })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tempo de corte deste item em minutos</Label>
                  <MoneyInput
                    value={item.minutosCorte}
                    onChange={(n) => setItem({ ...item, minutosCorte: n })}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Linha label="Custo do uso da base neste corte" value={brl(custoBaseCorte)} />
                <Linha label="Custo da lâmina para cortar" value={brl(custoLaminaItem)} />
                <Linha
                  label="Custo total lâmina + base"
                  value={brl(custoMaquinaTotal)}
                  highlight
                />
              </div>
            </div>
          </TabsContent>

          {/* -------- TESOURA -------- */}
          <TabsContent value="tesoura" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Se você corta na tesoura, informe os custos de troca e afiação. Vamos ratear
              esses valores por corte.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Valor da tesoura (R$)</Label>
                <MoneyInput
                  value={tesoura.valorTesoura}
                  onChange={(n) => setTesoura({ ...tesoura, valorTesoura: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vida útil da tesoura (nº de cortes)</Label>
                <MoneyInput
                  value={tesoura.vidaUtilCortes}
                  onChange={(n) => setTesoura({ ...tesoura, vidaUtilCortes: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Custo de uma afiação (R$)</Label>
                <MoneyInput
                  value={tesoura.custoAfiacao}
                  onChange={(n) => setTesoura({ ...tesoura, custoAfiacao: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cortes entre uma afiação e outra</Label>
                <MoneyInput
                  value={tesoura.cortesEntreAfiacoes}
                  onChange={(n) =>
                    setTesoura({ ...tesoura, cortesEntreAfiacoes: n })
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Linha
                label="Custo troca por corte"
                value={brl(custoTrocaTesouraPorCorte)}
              />
              <Linha
                label="Custo afiação por corte"
                value={brl(custoAfiacaoPorCorte)}
              />
              <Linha
                label="Custo total por corte"
                value={brl(custoTesouraPorCorte)}
                highlight
              />
            </div>

            <div className="border-t border-border/60 pt-5 space-y-4">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={item.usaTesoura}
                  onChange={(e) => setItem({ ...item, usaTesoura: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Este item usa corte manual (tesoura)
              </label>
              {item.usaTesoura && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Quantidade de cortes manuais neste item</Label>
                    <MoneyInput
                      value={item.cortesManuais}
                      onChange={(n) => setItem({ ...item, cortesManuais: n })}
                    />
                  </div>
                  <Linha
                    label="Custo tesoura neste item"
                    value={brl(custoTesouraItem)}
                    highlight
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* ==== Impressão ==== */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Printer className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Custos de impressão</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Valor do kit de tintas (R$)</Label>
            <MoneyInput
              value={impressao.valorKit}
              onChange={(n) => setImpressao({ ...impressao, valorKit: n })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Páginas impressas por kit</Label>
            <MoneyInput
              value={impressao.paginasPorKit}
              onChange={(n) => setImpressao({ ...impressao, paginasPorKit: n })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Custo de tinta por página</Label>
            <div className="h-11 rounded-md border border-primary/30 bg-primary/10 px-3 flex items-center font-display text-base font-semibold">
              {brl(custoTintaPagina)}
            </div>
          </div>
        </div>
        <div className="mt-5 border-t border-border/60 pt-5 grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Quantas páginas serão impressas neste projeto?</Label>
            <MoneyInput
              value={item.paginasImpressas}
              onChange={(n) => setItem({ ...item, paginasImpressas: n })}
            />
          </div>
          <Linha
            label="Valor total de impressão do projeto"
            value={brl(custoImpressaoItem)}
            highlight
          />
        </div>
      </Card>

      {/* ==== Resumo ==== */}
      <Card className="rounded-3xl border-primary/30 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h2 className="font-display text-lg font-semibold">Resumo do custo do item</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Linha label="Materiais" value={brl(custoMateriais)} />
          <Linha
            label={`Mão de obra (${item.minutos} min · ${brl(valorHora)}/h)`}
            value={brl(custoMaoDeObra)}
          />
          <Linha label="Máquina (base + lâmina)" value={brl(custoMaquinaTotal)} />
          <Linha label="Impressão" value={brl(custoImpressaoItem)} />
          {item.usaTesoura && (
            <Linha label="Tesoura / corte manual" value={brl(custoTesouraItem)} />
          )}
        </div>
        <div className="mt-6 rounded-2xl border border-primary/40 bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Custo total do item
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-primary">
            {brl(custoTotal)}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="rounded-full gap-2" onClick={exportarPDF}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button size="lg" className="rounded-full gap-2 px-8" onClick={salvar}>
            <Save className="h-4 w-4" /> Salvar precificação
          </Button>
        </div>
      </Card>

      {salvos.length > 0 && (
        <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-display text-lg font-semibold">Itens precificados</h2>
          <div className="space-y-2">
            {salvos.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{s.nome || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.materiais.length} materiais · {s.minutos} min
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => carregar(s)}>
                    Abrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => excluirSalvo(s.id)}
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

function Linha({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-background"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
