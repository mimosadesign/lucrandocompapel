import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Target, TrendingUp, Wallet, PartyPopper, Save } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocalState, brl, parseNum } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento Mensal — Lucrando com Papel" }] }),
  component: FaturamentoPage,
});

type Pedido = {
  id: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
};
type Produto = { id: string; nome: string; custo: number; margemPct: number };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function FaturamentoPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Faturamento Mensal"
        diamond
        description="Acompanhe sua meta, lucro real e evolução mês a mês — com aquela celebração quando bater a meta 🎉"
      />
      <DiamondLock
        title="Veja todo o dinheiro que passa pelo seu ateliê"
        description="Painel completo com meta vs realizado, detalhamento de custos, controle de caixa real, lucro líquido e histórico mês a mês com gráficos."
        preview={<FaturamentoDashboard />}
      />
    </div>
  );
}

function FaturamentoDashboard() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [meta, setMeta] = useLocalState<number>("lcp:meta", 0);
  const [metaInput, setMetaInput] = useState("");

  useEffect(() => {
    setMetaInput(meta ? String(meta) : "");
  }, [meta]);

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const pedidosMes = useMemo(
    () =>
      pedidos.filter((p) => {
        if (!p.entrega || p.status === "Cancelado") return false;
        const d = new Date(p.entrega);
        if (isNaN(d.getTime())) return false;
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }),
    [pedidos, mesAtual, anoAtual],
  );

  const faturamentoMes = pedidosMes.reduce(
    (s, p) => s + (p.valor || 0) + (p.valorEntrega || 0),
    0,
  );
  const recebidoMes = pedidosMes
    .filter((p) => p.status === "Entregue")
    .reduce((s, p) => s + (p.valor || 0) + (p.valorEntrega || 0), 0);

  const margemMedia = useMemo(() => {
    if (!produtos.length) return 0;
    const validos = produtos.filter((p) => p.margemPct > 0);
    if (!validos.length) return 0;
    return validos.reduce((s, p) => s + p.margemPct, 0) / validos.length;
  }, [produtos]);

  const lucroEstimado = faturamentoMes * (margemMedia / 100);
  const pctMeta = meta > 0 ? Math.min(100, (faturamentoMes / meta) * 100) : 0;
  const bateuMeta = meta > 0 && faturamentoMes >= meta;
  const ticketMedio = pedidosMes.length ? faturamentoMes / pedidosMes.length : 0;

  const historico = useMemo(() => {
    const buckets: { mes: string; faturamento: number; pedidos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      buckets.push({ mes: MESES[d.getMonth()], faturamento: 0, pedidos: 0 });
    }
    for (const p of pedidos) {
      if (!p.entrega || p.status === "Cancelado") continue;
      const d = new Date(p.entrega);
      if (isNaN(d.getTime())) continue;
      const diff = (anoAtual - d.getFullYear()) * 12 + (mesAtual - d.getMonth());
      if (diff < 0 || diff > 5) continue;
      const idx = 5 - diff;
      buckets[idx].faturamento += (p.valor || 0) + (p.valorEntrega || 0);
      buckets[idx].pedidos += 1;
    }
    return buckets;
  }, [pedidos, mesAtual, anoAtual]);

  const mediaUltimos = historico.slice(0, 5).filter((b) => b.faturamento > 0);
  const mediaMensal = mediaUltimos.length
    ? mediaUltimos.reduce((s, b) => s + b.faturamento, 0) / mediaUltimos.length
    : 0;

  function salvarMeta() {
    const v = parseNum(metaInput);
    setMeta(v);
    toast.success("Meta salva!");
  }

  return (
    <div className="space-y-6">
      {bateuMeta && (
        <Card className="rounded-3xl border-success/40 bg-success/10 p-5 flex items-center gap-3">
          <PartyPopper className="h-6 w-6 text-success" />
          <div>
            <p className="font-display text-lg font-semibold">Meta batida! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Você superou {brl(meta)} este mês. Continue assim!
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Faturamento do mês"
          value={brl(faturamentoMes)}
          sub={`${pedidosMes.length} pedido(s)`}
        />
        <Kpi
          icon={<Target className="h-4 w-4" />}
          label="Meta mensal"
          value={meta > 0 ? brl(meta) : "—"}
          sub={meta > 0 ? `${pctMeta.toFixed(0)}% atingido` : "Defina abaixo"}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro estimado"
          value={brl(lucroEstimado)}
          sub={`Margem média ${margemMedia.toFixed(0)}%`}
        />
      </div>

      <Card className="rounded-3xl p-6">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <p className="font-display text-base font-semibold">Sua meta mensal</p>
            <p className="text-sm text-muted-foreground">
              Sugestão com base nos últimos meses: <strong>{brl(mediaMensal)}</strong>
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Meta (R$)</Label>
              <Input
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                placeholder="Ex: 5000"
                className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4 w-44"
              />
            </div>
            <Button className="rounded-full h-11 gap-2" onClick={salvarMeta}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
        {meta > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{brl(faturamentoMes)}</span>
              <span>{brl(meta)}</span>
            </div>
            <Progress value={pctMeta} className="h-3" />
          </div>
        )}
      </Card>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold mb-4">Últimos 6 meses</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
              />
              {meta > 0 && (
                <ReferenceLine
                  y={meta}
                  stroke="var(--primary)"
                  strokeDasharray="4 4"
                  label={{ value: "Meta", fill: "var(--primary)", fontSize: 11 }}
                />
              )}
              <Bar dataKey="faturamento" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Já recebido este mês</p>
          <p className="font-display text-2xl font-semibold mt-1">{brl(recebidoMes)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Soma dos pedidos com status “Entregue”.
          </p>
        </Card>
        <Card className="rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Ticket médio</p>
          <p className="font-display text-2xl font-semibold mt-1">{brl(ticketMedio)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Faturamento ÷ nº de pedidos no mês.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="rounded-3xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <p className="font-display text-2xl font-semibold mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}
