import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Wallet, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";
import { DiamondLock } from "@/components/diamond-lock";

export const Route = createFileRoute("/calculadoras")({
  head: () => ({
    meta: [
      { title: "Calculadoras — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Calculadora de parcelamento com taxas e calculadora de caixa diário para o seu ateliê de papelaria.",
      },
      { property: "og:title", content: "Calculadoras — Lucrando com Papel" },
      {
        property: "og:description",
        content:
          "Simule parcelamentos com taxa e feche o caixa do dia por PIX, dinheiro, cartão e fiado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalculadorasPage,
});

// Taxas padrão aproximadas do Mercado Pago (link de pagamento, recebimento na hora)
const TAXAS_PARCELAS: Record<number, number> = {
  1: 4.98,
  2: 8.09,
  3: 9.98,
  4: 11.83,
  5: 13.64,
  6: 15.41,
  7: 17.14,
  8: 18.84,
  9: 20.5,
  10: 22.12,
  11: 23.71,
  12: 25.27,
};

type Venda = {
  id: string;
  cliente?: string;
  descricao: string;
  valor: number;
  forma: "PIX" | "Dinheiro" | "Cartão" | "Fiado";
  /** Prazo final para receber (somente fiado) */
  prazoFiado?: string;
};

function CalculadorasPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Calculadoras"
        description="Simule parcelamentos sem perder dinheiro e feche o caixa do dia em segundos."
      />
      <DiamondLock
        title="Calculadoras do Diamante"
        description="Simule parcelamentos com taxa real e feche o caixa do dia com controle de fiado e prazos. Disponível no plano Diamante."
        preview={
          <div className="space-y-6">
            <Parcelamento />
            <Caixa />
          </div>
        }
      />
    </div>
  );
}

function Parcelamento() {
  const [valor, setValor] = useState(0);
  const [parcelas, setParcelas] = useState(3);
  const [comissaoPct, setComissaoPct] = useState("0");
  const [quemPaga, setQuemPaga] = useState<"eu" | "cliente">("eu");

  const taxaPct = TAXAS_PARCELAS[parcelas] ?? 0;
  const comissao = (parseFloat(comissaoPct.replace(",", ".")) || 0) / 100;

  const resultado = useMemo(() => {
    if (quemPaga === "eu") {
      const taxa = valor * (taxaPct / 100);
      const comis = valor * comissao;
      const liquido = valor - taxa - comis;
      return {
        cobrar: valor,
        parcelaCliente: valor / parcelas,
        taxa,
        comis,
        liquido,
      };
    }
    // Repassa a taxa para o cliente: preço bruto tal que líquido = valor
    const bruto = valor / (1 - taxaPct / 100 - comissao || 1);
    const taxa = bruto * (taxaPct / 100);
    const comis = bruto * comissao;
    return {
      cobrar: bruto,
      parcelaCliente: bruto / parcelas,
      taxa,
      comis,
      liquido: bruto - taxa - comis,
    };
  }, [valor, parcelas, taxaPct, comissao, quemPaga]);

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-base font-semibold">Calculadora de Parcelamento</p>
          <p className="text-sm text-muted-foreground">
            “Se eu vender em 10x…” — já desconta taxa da maquininha/link e comissão.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Valor da venda
          </Label>
          <MoneyInput value={valor} onChange={setValor} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Parcelas
          </Label>
          <select
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
            className="mt-1.5 h-11 w-full rounded-full border border-border/70 bg-background px-4 text-sm"
          >
            {Object.keys(TAXAS_PARCELAS).map((n) => (
              <option key={n} value={n}>
                {n}x — taxa {TAXAS_PARCELAS[Number(n)].toFixed(2)}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Comissão do vendedor (%)
          </Label>
          <Input
            value={comissaoPct}
            onChange={(e) => setComissaoPct(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={quemPaga === "eu" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setQuemPaga("eu")}
        >
          Eu absorvo a taxa
        </Button>
        <Button
          size="sm"
          variant={quemPaga === "cliente" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setQuemPaga("cliente")}
        >
          Repassar a taxa ao cliente
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobrar</p>
          <p className="font-display text-lg font-semibold">{brl(resultado.cobrar)}</p>
        </div>
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {parcelas}x de
          </p>
          <p className="font-display text-lg font-semibold">{brl(resultado.parcelaCliente)}</p>
        </div>
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Taxa + comissão
          </p>
          <p className="font-display text-lg font-semibold">
            {brl(resultado.taxa + resultado.comis)}
          </p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Você recebe</p>
          <p className="font-display text-lg font-semibold">{brl(resultado.liquido)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Taxas de referência do Mercado Pago (recebimento na hora). Confira as taxas da sua conta —
        elas podem variar.
      </p>
    </Card>
  );
}

const FORMAS: Venda["forma"][] = ["PIX", "Dinheiro", "Cartão", "Fiado"];

function Caixa() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [dia, setDia] = useLocalState<string>("lcp:caixa:dia", hoje);
  const [vendas, setVendas] = useLocalState<Venda[]>("lcp:caixa:vendas", []);
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [forma, setForma] = useState<Venda["forma"]>("PIX");
  const [prazoFiado, setPrazoFiado] = useState("");

  const doDia = dia === hoje ? vendas : vendas;

  const totais = useMemo(() => {
    const t: Record<Venda["forma"], number> = {
      PIX: 0,
      Dinheiro: 0,
      Cartão: 0,
      Fiado: 0,
    };
    for (const v of doDia) t[v.forma] += v.valor;
    const recebido = t.PIX + t.Dinheiro + t["Cartão"];
    return { ...t, recebido, total: recebido + t.Fiado };
  }, [doDia]);

  function adicionar() {
    if (valor <= 0) return;
    setVendas([
      ...vendas,
      {
        id: crypto.randomUUID(),
        cliente: cliente.trim(),
        descricao: descricao.trim() || "Venda",
        valor,
        forma,
        prazoFiado: forma === "Fiado" ? prazoFiado : undefined,
      },
    ]);
    setCliente("");
    setDescricao("");
    setValor(0);
    setPrazoFiado("");
  }

  const fiados = doDia.filter((v) => v.forma === "Fiado");

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold">Calculadora de Caixa</p>
          <p className="text-sm text-muted-foreground">
            Lance cada venda por forma de pagamento e feche o caixa do dia automaticamente.
          </p>
        </div>
        <Input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="h-11 w-40 rounded-full border-border/70 bg-background px-4"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_150px_150px_auto]">
        <Input
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Nome do cliente"
          className="h-11 rounded-full border-border/70 bg-background px-4"
        />
        <Input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          className="h-11 rounded-full border-border/70 bg-background px-4"
        />
        <MoneyInput value={valor} onChange={setValor} />
        <select
          value={forma}
          onChange={(e) => setForma(e.target.value as Venda["forma"])}
          className="h-11 rounded-full border border-border/70 bg-background px-4 text-sm"
        >
          {FORMAS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <Button className="h-11 rounded-full gap-2" onClick={adicionar}>
          <Plus className="h-4 w-4" /> Lançar
        </Button>
      </div>

      {forma === "Fiado" ? (
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

      {doDia.length > 0 ? (
        <div className="space-y-1.5">
          {doDia.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {v.cliente ? <strong>{v.cliente}</strong> : null}
                {v.cliente ? " · " : ""}
                {v.descricao}
                {v.prazoFiado ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · receber até {new Date(`${v.prazoFiado}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
              </span>
              <Badge variant="secondary" className="rounded-full">
                {v.forma}
              </Badge>
              <strong>{brl(v.valor)}</strong>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-destructive"
                onClick={() => setVendas(vendas.filter((x) => x.id !== v.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-5">
        {FORMAS.map((f) => (
          <div key={f} className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{f}</p>
            <p className="font-display text-lg font-semibold">{brl(totais[f])}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-primary/10 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Caixa do dia</p>
          <p className="font-display text-lg font-semibold">{brl(totais.recebido)}</p>
          <p className="text-xs text-muted-foreground">
            + {brl(totais.Fiado)} a receber (fiado)
          </p>
        </div>
      </div>

      {fiados.length > 0 ? (
        <div className="space-y-1.5 rounded-2xl border border-border/60 p-3">
          <p className="text-sm font-medium">A receber (fiado)</p>
          {fiados.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{v.cliente || v.descricao}</span>
              <span className="text-muted-foreground">
                {v.prazoFiado
                  ? new Date(`${v.prazoFiado}T12:00:00`).toLocaleDateString("pt-BR")
                  : "sem prazo"}
              </span>
              <strong>{brl(v.valor)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {vendas.length > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="rounded-full text-destructive"
            onClick={() => setVendas([])}
          >
            Fechar caixa e limpar lançamentos
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
