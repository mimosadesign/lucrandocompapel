import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";
import { DiamondLock } from "@/components/diamond-lock";
import { shareWhats } from "@/lib/share";
import { toast } from "sonner";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa Diário — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Controle o caixa diário do seu ateliê: entradas, saídas, fiado com prazo, fechamento do dia e resumo do mês.",
      },
      { property: "og:title", content: "Caixa Diário — Lucrando com Papel" },
      {
        property: "og:description",
        content:
          "Lance vendas e despesas, acompanhe o fiado a receber e feche o caixa do dia em segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CaixaPage,
});

type Forma = "PIX" | "Dinheiro" | "Cartão" | "Fiado";
const FORMAS: Forma[] = ["PIX", "Dinheiro", "Cartão", "Fiado"];

type Lancamento = {
  id: string;
  tipo: "entrada" | "saida";
  data: string; // yyyy-mm-dd
  cliente?: string;
  descricao: string;
  categoria?: string;
  valor: number;
  forma: Forma;
  prazoFiado?: string;
  recebido?: boolean;
};

type LegacyVenda = {
  id: string;
  cliente?: string;
  descricao: string;
  valor: number;
  forma: Forma;
  prazoFiado?: string;
};

const CATEGORIAS_SAIDA = [
  "Materiais",
  "Embalagens",
  "Transporte",
  "Marketing",
  "Taxas",
  "Retirada (pró-labore)",
  "Outros",
];

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmtData = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

function CaixaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Caixa Diário"
        description="Lance entradas e saídas, controle o fiado com prazo e feche o caixa do dia."
      />
      <DiamondLock
        title="Caixa Diário do Diamante"
        description="Controle completo do dinheiro do ateliê: entradas por forma de pagamento, despesas, fiado com prazo, fechamento do dia e resumo do mês. Disponível no plano Diamante."
        preview={<CaixaCompleto />}
      />
    </div>
  );
}

function CaixaCompleto() {
  const [dia, setDia] = useState(hojeISO());
  const [lancamentos, setLancamentos] = useLocalState<Lancamento[]>(
    "lcp:caixa:lancamentos",
    [],
  );
  const [legacy, setLegacy] = useLocalState<LegacyVenda[]>("lcp:caixa:vendas", []);

  // Migra os lançamentos antigos (que ficavam junto das calculadoras)
  useEffect(() => {
    if (legacy.length === 0) return;
    const migrados: Lancamento[] = legacy.map((v) => ({
      id: v.id,
      tipo: "entrada",
      data: hojeISO(),
      cliente: v.cliente,
      descricao: v.descricao,
      valor: v.valor,
      forma: v.forma,
      prazoFiado: v.prazoFiado,
    }));
    setLancamentos((prev) => [...prev, ...migrados]);
    setLegacy([]);
  }, [legacy.length]);

  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_SAIDA[0]);
  const [valor, setValor] = useState(0);
  const [forma, setForma] = useState<Forma>("PIX");
  const [prazoFiado, setPrazoFiado] = useState("");

  const doDia = useMemo(
    () => lancamentos.filter((l) => l.data === dia),
    [lancamentos, dia],
  );

  const totais = useMemo(() => {
    const porForma: Record<Forma, number> = { PIX: 0, Dinheiro: 0, Cartão: 0, Fiado: 0 };
    let saidas = 0;
    for (const l of doDia) {
      if (l.tipo === "saida") saidas += l.valor;
      else porForma[l.forma] += l.valor;
    }
    const recebido = porForma.PIX + porForma.Dinheiro + porForma["Cartão"];
    return {
      porForma,
      saidas,
      recebido,
      fiado: porForma.Fiado,
      saldo: recebido - saidas,
      bruto: recebido + porForma.Fiado,
    };
  }, [doDia]);

  const mes = dia.slice(0, 7);
  const resumoMes = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    const dias = new Set<string>();
    for (const l of lancamentos) {
      if (!l.data.startsWith(mes)) continue;
      dias.add(l.data);
      if (l.tipo === "saida") saidas += l.valor;
      else if (l.forma !== "Fiado") entradas += l.valor;
    }
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      dias: dias.size,
      media: dias.size ? (entradas - saidas) / dias.size : 0,
    };
  }, [lancamentos, mes]);

  const fiadosAbertos = useMemo(
    () =>
      lancamentos
        .filter((l) => l.tipo === "entrada" && l.forma === "Fiado" && !l.recebido)
        .sort((a, b) => (a.prazoFiado || "9999").localeCompare(b.prazoFiado || "9999")),
    [lancamentos],
  );
  const totalFiadoAberto = fiadosAbertos.reduce((s, l) => s + l.valor, 0);

  function adicionar() {
    if (valor <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setLancamentos([
      ...lancamentos,
      {
        id: crypto.randomUUID(),
        tipo,
        data: dia,
        cliente: tipo === "entrada" ? cliente.trim() : undefined,
        descricao:
          descricao.trim() || (tipo === "entrada" ? "Venda" : categoria || "Despesa"),
        categoria: tipo === "saida" ? categoria : undefined,
        valor,
        forma: tipo === "saida" ? (forma === "Fiado" ? "Dinheiro" : forma) : forma,
        prazoFiado: tipo === "entrada" && forma === "Fiado" ? prazoFiado : undefined,
      },
    ]);
    setCliente("");
    setDescricao("");
    setValor(0);
    setPrazoFiado("");
    toast.success(tipo === "entrada" ? "Entrada lançada!" : "Saída lançada!");
  }

  function remover(id: string) {
    setLancamentos(lancamentos.filter((l) => l.id !== id));
  }

  function marcarRecebido(l: Lancamento) {
    setLancamentos(
      lancamentos.map((x) =>
        x.id === l.id ? { ...x, recebido: true, forma: "PIX" as Forma } : x,
      ),
    );
    toast.success("Fiado marcado como recebido.");
  }

  function exportarCsv() {
    const linhas = [
      ["Data", "Tipo", "Cliente", "Descrição", "Categoria", "Forma", "Valor", "Prazo fiado"],
      ...lancamentos
        .slice()
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => [
          l.data,
          l.tipo,
          l.cliente ?? "",
          l.descricao,
          l.categoria ?? "",
          l.forma,
          l.valor.toFixed(2).replace(".", ","),
          l.prazoFiado ?? "",
        ]),
    ];
    const csv = linhas.map((c) => c.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `caixa-${dia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function compartilharFechamento() {
    const linhas = doDia.map(
      (l) =>
        `${l.tipo === "saida" ? "➖" : "➕"} ${l.cliente ? `${l.cliente} · ` : ""}${l.descricao} (${l.forma}) — ${brl(l.valor)}`,
    );
    const texto = [
      `*Fechamento de caixa — ${fmtData(dia)}*`,
      "",
      ...linhas,
      "",
      `Recebido: ${brl(totais.recebido)}`,
      `Saídas: ${brl(totais.saidas)}`,
      `Saldo do dia: ${brl(totais.saldo)}`,
      `Fiado a receber: ${brl(totais.fiado)}`,
    ].join("\n");
    shareWhats(texto);
  }

  return (
    <div className="space-y-6">
      {/* Lançamento */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-display text-base font-semibold">Novo lançamento</p>
            <p className="text-sm text-muted-foreground">
              Tudo que entra e sai do caixa, no dia escolhido.
            </p>
          </div>
          <Input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="h-11 w-44 rounded-full border-border/70 bg-background px-4"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={tipo === "entrada" ? "default" : "outline"}
            className="rounded-full gap-2"
            onClick={() => setTipo("entrada")}
          >
            <ArrowUpCircle className="h-4 w-4" /> Entrada
          </Button>
          <Button
            size="sm"
            variant={tipo === "saida" ? "default" : "outline"}
            className="rounded-full gap-2"
            onClick={() => setTipo("saida")}
          >
            <ArrowDownCircle className="h-4 w-4" /> Saída
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_150px_150px_auto]">
          {tipo === "entrada" ? (
            <Input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
              className="h-11 rounded-full border-border/70 bg-background px-4"
            />
          ) : (
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="h-11 rounded-full border border-border/70 bg-background px-4 text-sm"
            >
              {CATEGORIAS_SAIDA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (opcional)"
            className="h-11 rounded-full border-border/70 bg-background px-4"
          />
          <MoneyInput value={valor} onChange={setValor} />
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value as Forma)}
            className="h-11 rounded-full border border-border/70 bg-background px-4 text-sm"
          >
            {(tipo === "entrada" ? FORMAS : FORMAS.filter((f) => f !== "Fiado")).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Button className="h-11 rounded-full gap-2" onClick={adicionar}>
            <Plus className="h-4 w-4" /> Lançar
          </Button>
        </div>

        {tipo === "entrada" && forma === "Fiado" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary/5 p-3">
            <Label className="text-sm">Prazo final para receber</Label>
            <Input
              type="date"
              value={prazoFiado}
              onChange={(e) => setPrazoFiado(e.target.value)}
              className="h-10 w-44 rounded-full border-border/70 bg-background px-4"
            />
            <span className="text-xs text-muted-foreground">
              Fica registrado para você cobrar na data certa.
            </span>
          </div>
        ) : null}
      </Card>

      {/* Resumo do dia */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-base font-semibold">
            Resumo de {fmtData(dia)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-2"
              onClick={compartilharFechamento}
              disabled={doDia.length === 0}
            >
              <Share2 className="h-4 w-4" /> Enviar no WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-2"
              onClick={exportarCsv}
              disabled={lancamentos.length === 0}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FORMAS.map((f) => (
            <div key={f} className="rounded-2xl bg-background/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{f}</p>
              <p className="font-display text-lg font-semibold">{brl(totais.porForma[f])}</p>
            </div>
          ))}
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saídas</p>
            <p className="font-display text-lg font-semibold text-destructive">
              -{brl(totais.saidas)}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo do dia</p>
            <p className="font-display text-lg font-semibold">{brl(totais.saldo)}</p>
            <p className="text-xs text-muted-foreground">
              + {brl(totais.fiado)} em fiado
            </p>
          </div>
        </div>

        {doDia.length > 0 ? (
          <div className="space-y-1.5">
            {doDia.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
              >
                {l.tipo === "saida" ? (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {l.cliente ? <strong>{l.cliente}</strong> : null}
                  {l.cliente ? " · " : ""}
                  {l.descricao}
                  {l.categoria ? (
                    <span className="text-muted-foreground"> · {l.categoria}</span>
                  ) : null}
                  {l.prazoFiado ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · receber até {fmtData(l.prazoFiado)}
                    </span>
                  ) : null}
                </span>
                <Badge variant="secondary" className="rounded-full">
                  {l.forma}
                </Badge>
                <strong className={l.tipo === "saida" ? "text-destructive" : ""}>
                  {l.tipo === "saida" ? "-" : ""}
                  {brl(l.valor)}
                </strong>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-destructive"
                  onClick={() => remover(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento neste dia ainda.
          </p>
        )}
      </Card>

      {/* Fiado em aberto */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-base font-semibold">A receber (fiado)</p>
          <strong>{brl(totalFiadoAberto)}</strong>
        </div>
        {fiadosAbertos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada em aberto. 🎉</p>
        ) : (
          fiadosAbertos.map((l) => {
            const atrasado = !!l.prazoFiado && l.prazoFiado < hojeISO();
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {l.cliente || l.descricao}
                  <span className="text-muted-foreground"> · venda em {fmtData(l.data)}</span>
                </span>
                <Badge
                  variant={atrasado ? "destructive" : "secondary"}
                  className="rounded-full"
                >
                  {l.prazoFiado ? fmtData(l.prazoFiado) : "sem prazo"}
                </Badge>
                <strong>{brl(l.valor)}</strong>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5"
                  onClick={() => marcarRecebido(l)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Recebi
                </Button>
              </div>
            );
          })
        )}
      </Card>

      {/* Resumo do mês */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
        <p className="font-display text-base font-semibold">
          Resumo do mês ({new Date(`${mes}-15T12:00:00`).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })})
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Entradas</p>
            <p className="font-display text-lg font-semibold">{brl(resumoMes.entradas)}</p>
          </div>
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saídas</p>
            <p className="font-display text-lg font-semibold text-destructive">
              -{brl(resumoMes.saidas)}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
            <p className="font-display text-lg font-semibold">{brl(resumoMes.saldo)}</p>
          </div>
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Média por dia
            </p>
            <p className="font-display text-lg font-semibold">{brl(resumoMes.media)}</p>
            <p className="text-xs text-muted-foreground">{resumoMes.dias} dia(s) com movimento</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
