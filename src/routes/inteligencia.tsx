import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, TrendingUp, AlertTriangle, Percent, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/inteligencia")({
  head: () => ({ meta: [{ title: "Inteligência Financeira — Lucrando com Papel" }] }),
  component: InteligenciaPage,
});

type Pedido = { id: string; valor: number; valorEntrega?: number; status: string; entrega?: string; produto?: string };
type Produto = { id: string; nome: string; custo: number; margemPct: number };

function InteligenciaPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Inteligência Financeira"
        diamond
        description="Sua mentora financeira: break-even, cenários, simuladores de desconto e análise dos produtos que mais lucram."
      />
      <DiamondLock
        title="Tome decisões com a clareza de uma CEO"
        description="Descubra seu ponto de equilíbrio, simule cenários de desconto, veja quais produtos te dão mais lucro e receba sugestões para crescer com segurança."
        preview={<InteligenciaDashboard />}
      />
    </div>
  );
}

function InteligenciaDashboard() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [custoFixo, setCustoFixo] = useLocalState<number>("lcp:custoFixo", 0);
  
  const [descontoPct, setDescontoPct] = useState(10);

  const margemMedia = useMemo(() => {
    const validos = produtos.filter((p) => p.margemPct > 0);
    if (!validos.length) return 0;
    return validos.reduce((s, p) => s + p.margemPct, 0) / validos.length;
  }, [produtos]);

  const ticketMedio = useMemo(() => {
    const ativos = pedidos.filter((p) => p.status !== "Cancelado");
    if (!ativos.length) return 0;
    return ativos.reduce((s, p) => s + (p.valor || 0) + (p.valorEntrega || 0), 0) / ativos.length;
  }, [pedidos]);

  const breakEvenReais = margemMedia > 0 ? custoFixo / (margemMedia / 100) : 0;
  const breakEvenPedidos = ticketMedio > 0 && breakEvenReais > 0 ? Math.ceil(breakEvenReais / ticketMedio) : 0;

  const topProdutos = useMemo(() => {
    const counts: Record<string, { nome: string; vendas: number; faturamento: number }> = {};
    for (const p of pedidos) {
      if (p.status === "Cancelado") continue;
      const nome = p.produto || "Sem produto";
      if (!counts[nome]) counts[nome] = { nome, vendas: 0, faturamento: 0 };
      counts[nome].vendas += 1;
      counts[nome].faturamento += (p.valor || 0) + (p.valorEntrega || 0);
    }
    return Object.values(counts).sort((a, b) => b.faturamento - a.faturamento).slice(0, 5);
  }, [pedidos]);

  const cenarios = useMemo(() => {
    const base = ticketMedio * Math.max(pedidos.filter((p) => p.status !== "Cancelado").length, 1);
    return [
      { nome: "Conservador (-20%)", valor: base * 0.8 },
      { nome: "Realista", valor: base },
      { nome: "Otimista (+30%)", valor: base * 1.3 },
    ];
  }, [pedidos, ticketMedio]);

  // Simulador de desconto
  const margemPosDesconto = margemMedia - descontoPct;
  const alertaDesconto = margemPosDesconto <= 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Percent className="h-4 w-4" /> Margem média
          </p>
          <p className="font-display text-2xl font-semibold mt-2">{margemMedia.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Média dos seus produtos cadastrados</p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Ticket médio
          </p>
          <p className="font-display text-2xl font-semibold mt-2">{brl(ticketMedio)}</p>
          <p className="text-xs text-muted-foreground mt-1">Valor médio por pedido</p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" /> Break-even (mensal)
          </p>
          <p className="font-display text-2xl font-semibold mt-2">{brl(breakEvenReais)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {breakEvenPedidos > 0 ? `≈ ${breakEvenPedidos} pedidos para empatar` : "Defina seus custos fixos"}
          </p>
        </Card>
      </div>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold">Quanto você precisa faturar para empatar?</p>
        <p className="text-sm text-muted-foreground mt-1">
          Some seu pró-labore, contas fixas, plataformas e tudo que sai todo mês.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Custo fixo mensal (R$)</Label>
            <MoneyInput
              value={custoFixo}
              onChange={(n) => setCustoFixo(n)}
              placeholder="Ex: 2500,00"
              className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Inclua pró-labore, aluguel, contas, plataformas — tudo que sai todo mês.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Faturamento para empatar
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{brl(breakEvenReais)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Com margem média de {margemMedia.toFixed(0)}%
              {breakEvenPedidos > 0 && ` · ≈ ${breakEvenPedidos} pedidos`}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            className="rounded-full gap-2"
            onClick={() => toast.success("Custo fixo salvo!")}
          >
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold">Simulador de desconto</p>
        <p className="text-sm text-muted-foreground mt-1">
          Veja o impacto antes de oferecer aquele desconto no WhatsApp.
        </p>
        <div className="mt-5 max-w-md">
          <Label className="text-xs uppercase text-muted-foreground">
            Desconto: {descontoPct}%
          </Label>
          <Slider
            value={[descontoPct]}
            min={0}
            max={50}
            step={1}
            onValueChange={(v) => setDescontoPct(v[0])}
            className="mt-3"
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${alertaDesconto ? "border-destructive/40 bg-destructive/10" : "border-border"}`}>
            <p className="text-xs uppercase text-muted-foreground">Margem após desconto</p>
            <p className="font-display text-2xl font-semibold mt-1">
              {margemPosDesconto.toFixed(0)}%
            </p>
            {alertaDesconto && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Você estaria vendendo no prejuízo!
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Pedido típico com desconto</p>
            <p className="font-display text-2xl font-semibold mt-1">
              {brl(ticketMedio * (1 - descontoPct / 100))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Era {brl(ticketMedio)} (ticket médio).
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold">Top 5 produtos que mais faturam</p>
        {topProdutos.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">
            Cadastre pedidos para ver seu ranking aqui.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {topProdutos.map((p, i) => (
              <div key={p.nome} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary font-semibold text-sm">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.vendas} venda(s)</p>
                </div>
                <p className="font-semibold">{brl(p.faturamento)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold">Cenários de faturamento</p>
        <p className="text-sm text-muted-foreground mt-1">
          Projeção baseada no seu volume atual de pedidos.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cenarios.map((c) => (
            <div key={c.nome} className="rounded-2xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">{c.nome}</p>
              <p className="font-display text-xl font-semibold mt-1">{brl(c.valor)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
