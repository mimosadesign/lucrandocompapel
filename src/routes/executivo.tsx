import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/executivo")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — Lucrando com Papel" }] }),
  component: ExecutivoPage,
});

type Pedido = {
  id: string;
  cliente: string;
  produto?: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
};
type Produto = { id: string; nome: string; custo: number; margemPct: number };

const STATUS = ["Em aberto", "Em produção", "Pronto", "Entregue"] as const;

function ExecutivoPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard Executivo"
        diamond
        description="Visão de CEO do seu ateliê: score de saúde, alertas inteligentes e fila de produção em kanban."
      />
      <DiamondLock
        title="Sua mentora financeira em um painel só"
        description="Score de 0 a 100, alertas como 'seu lucro caiu 12% esse mês', gargalos identificados e plano de ação automático para resolver."
        preview={<ExecutivoDashboard />}
      />
    </div>
  );
}

function ExecutivoDashboard() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [meta] = useLocalState<number>("lcp:meta", 0);

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  function inMonth(p: Pedido, offset: number) {
    if (!p.entrega) return false;
    const d = new Date(p.entrega);
    if (isNaN(d.getTime())) return false;
    const ref = new Date(anoAtual, mesAtual - offset, 1);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }

  const ativos = pedidos.filter((p) => p.status !== "Cancelado");
  const faturamentoMes = ativos
    .filter((p) => inMonth(p, 0))
    .reduce((s, p) => s + (p.valor || 0) + (p.valorEntrega || 0), 0);
  const faturamentoAnterior = ativos
    .filter((p) => inMonth(p, 1))
    .reduce((s, p) => s + (p.valor || 0) + (p.valorEntrega || 0), 0);

  const variacao =
    faturamentoAnterior > 0
      ? ((faturamentoMes - faturamentoAnterior) / faturamentoAnterior) * 100
      : 0;

  const margemMedia = useMemo(() => {
    const v = produtos.filter((p) => p.margemPct > 0);
    if (!v.length) return 0;
    return v.reduce((s, p) => s + p.margemPct, 0) / v.length;
  }, [produtos]);

  // Score 0-100: 25 produtos, 25 margem, 25 meta, 25 evolução
  const score = useMemo(() => {
    let s = 0;
    // Produtos cadastrados (até 25)
    if (produtos.length >= 5) s += 25;
    else s += produtos.length * 5;
    // Margem média (até 25)
    if (margemMedia >= 50) s += 25;
    else if (margemMedia >= 30) s += 18;
    else if (margemMedia >= 15) s += 10;
    else if (margemMedia > 0) s += 5;
    // Meta atingida (até 25)
    if (meta > 0) {
      const pct = (faturamentoMes / meta) * 100;
      if (pct >= 100) s += 25;
      else if (pct >= 70) s += 18;
      else if (pct >= 40) s += 10;
      else if (pct > 0) s += 4;
    } else if (faturamentoMes > 0) {
      s += 10;
    }
    // Evolução mês a mês (até 25)
    if (faturamentoAnterior > 0) {
      if (variacao > 10) s += 25;
      else if (variacao > 0) s += 18;
      else if (variacao === 0) s += 12;
      else if (variacao > -10) s += 6;
    } else if (faturamentoMes > 0) {
      s += 12;
    }
    return Math.min(100, Math.round(s));
  }, [produtos.length, margemMedia, meta, faturamentoMes, faturamentoAnterior, variacao]);

  // Alerts — exigem pelo menos 2 produtos cadastrados
  const alertas: { tipo: "warn" | "ok" | "info"; msg: string }[] = [];
  if (produtos.length < 2) {
    alertas.push({
      tipo: "info",
      msg: "Cadastre pelo menos 2 produtos para começar a receber alertas inteligentes do seu ateliê.",
    });
  } else {
    if (variacao < -10 && faturamentoAnterior > 0) {
      alertas.push({
        tipo: "warn",
        msg: `Seu faturamento caiu ${Math.abs(variacao).toFixed(0)}% em relação ao mês passado.`,
      });
    }
    if (variacao > 10) {
      alertas.push({
        tipo: "ok",
        msg: `Crescimento de ${variacao.toFixed(0)}% em relação ao mês passado. 🎉`,
      });
    }
    if (margemMedia > 0 && margemMedia < 20) {
      alertas.push({
        tipo: "warn",
        msg: `Sua margem média está baixa (${margemMedia.toFixed(0)}%). Revise os preços dos produtos.`,
      });
    }
    if (margemMedia >= 40) {
      alertas.push({
        tipo: "ok",
        msg: `Margem média saudável (${margemMedia.toFixed(0)}%). Continue assim!`,
      });
    }
    const baixaMargem = produtos.filter((p) => p.margemPct > 0 && p.margemPct < 20).length;
    if (baixaMargem > 0) {
      alertas.push({
        tipo: "warn",
        msg: `${baixaMargem} produto(s) com margem abaixo de 20%. Revise a precificação.`,
      });
    }
    if (meta > 0 && faturamentoMes >= meta) {
      alertas.push({ tipo: "ok", msg: "Você bateu sua meta deste mês! 🎉" });
    }
    if (meta > 0 && faturamentoMes > 0 && faturamentoMes < meta * 0.5) {
      alertas.push({
        tipo: "warn",
        msg: `Você está a ${((faturamentoMes / meta) * 100).toFixed(0)}% da meta — hora de acelerar as vendas.`,
      });
    }
    if (produtos.length < 5) {
      alertas.push({
        tipo: "info",
        msg: "Cadastre mais produtos para diversificar seu catálogo e liberar análises mais precisas.",
      });
    }
    const emAberto = ativos.filter((p) => p.status === "Em aberto").length;
    if (emAberto > 5) {
      alertas.push({
        tipo: "warn",
        msg: `Você tem ${emAberto} pedidos em aberto — comece a produção.`,
      });
    }
    if (!alertas.length) {
      alertas.push({ tipo: "ok", msg: "Tudo no controle por aqui. Bom trabalho! ✨" });
    }
  }

  const kanban = useMemo(() => {
    const map: Record<string, Pedido[]> = { "Em aberto": [], "Em produção": [], Pronto: [], Entregue: [] };
    for (const p of ativos) {
      if (p.status in map) map[p.status].push(p);
    }
    return map;
  }, [ativos]);

  const scoreColor =
    score >= 75 ? "text-success" : score >= 50 ? "text-primary" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card className="rounded-3xl p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Score de saúde</p>
          <div className="mt-3 relative mx-auto h-32 w-32">
            <svg viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
                className={scoreColor}
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold ${scoreColor}`}>
              {score}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {score >= 75 ? "Excelente!" : score >= 50 ? "Vai bem, mas dá para melhorar." : "Atenção — vamos cuidar disso."}
          </p>
        </Card>

        <div className="grid gap-3">
          <Card className="rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Faturamento do mês
              </p>
              <Badge
                variant="outline"
                className={`rounded-full text-xs ${variacao >= 0 ? "text-success" : "text-destructive"}`}
              >
                {variacao >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {variacao >= 0 ? "+" : ""}
                {variacao.toFixed(0)}%
              </Badge>
            </div>
            <p className="font-display text-3xl font-semibold mt-2">{brl(faturamentoMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">Mês anterior: {brl(faturamentoAnterior)}</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-3xl p-5">
              <p className="text-xs uppercase text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Pedidos ativos
              </p>
              <p className="font-display text-2xl font-semibold mt-2">
                {ativos.filter((p) => p.status !== "Entregue").length}
              </p>
            </Card>
            <Card className="rounded-3xl p-5">
              <p className="text-xs uppercase text-muted-foreground">Margem média</p>
              <p className="font-display text-2xl font-semibold mt-2">
                {margemMedia.toFixed(0)}%
              </p>
            </Card>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold mb-3">Alertas inteligentes</p>
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const Icon = a.tipo === "warn" ? AlertTriangle : a.tipo === "ok" ? CheckCircle2 : Activity;
            const cls =
              a.tipo === "warn"
                ? "bg-destructive/10 text-destructive"
                : a.tipo === "ok"
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground";
            return (
              <div key={i} className={`flex items-start gap-3 rounded-2xl p-3 ${cls}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{a.msg}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <p className="font-display text-base font-semibold mb-4">Fila de produção</p>
        <div className="grid gap-3 md:grid-cols-4">
          {STATUS.map((s) => (
            <div key={s} className="rounded-2xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide">{s}</p>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {kanban[s]?.length ?? 0}
                </Badge>
              </div>
              <div className="space-y-2 max-h-72 overflow-auto">
                {(kanban[s] ?? []).map((p) => (
                  <div key={p.id} className="rounded-xl bg-card p-3 text-sm shadow-sm">
                    <p className="font-medium truncate">{p.cliente || "Sem cliente"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.produto || "—"}</p>
                    <div className="mt-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {p.entrega ? new Date(p.entrega).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      <span className="font-medium">{brl((p.valor || 0) + (p.valorEntrega || 0))}</span>
                    </div>
                  </div>
                ))}
                {(kanban[s]?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum pedido</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
