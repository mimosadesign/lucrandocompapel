import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/money-input";
import { brl } from "@/lib/storage";
import { DiamondLock } from "@/components/diamond-lock";

export const Route = createFileRoute("/calculadoras")({
  head: () => ({
    meta: [
      { title: "Calculadora de Parcelamento — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Calculadora de parcelamento com taxas reais de cartão para o seu ateliê de papelaria.",
      },
      { property: "og:title", content: "Calculadora de Parcelamento — Lucrando com Papel" },
      {
        property: "og:description",
        content:
          "Simule parcelamentos com taxa da maquininha e comissão e veja quanto você recebe.",
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

function CalculadorasPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Calculadoras"
        description="Simule parcelamentos sem perder dinheiro com as taxas da maquininha."
      />
      <DiamondLock
        title="Calculadoras do Diamante"
        description="Simule parcelamentos com taxa real e comissão para saber exatamente quanto entra no seu bolso. Disponível no plano Diamante."
        preview={
          <div className="space-y-6">
            <Parcelamento />
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
