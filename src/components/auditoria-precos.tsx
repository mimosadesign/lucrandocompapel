import { useMemo } from "react";
import { AlertTriangle, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalState, brl } from "@/lib/storage";
import { useIsUnlimited } from "@/lib/auth";
import { humanMin, type SessaoProducao } from "@/components/cronometro-producao";

type Produto = { id: string; nome: string; custo: number; margemPct: number };
type Pedido = {
  id: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
};

const OPCOES_ALVO = [40, 50, 60, 70, 80];

export function AuditoriaPrecos() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [alvo, setAlvo] = useLocalState<number>("lcp:auditoria:alvo", 60);
  const [minima, setMinima] = useLocalState<number>("lcp:auditoria:minima", 30);
  const unlimited = useIsUnlimited();

  // Quantas vezes cada produto foi vendido (para priorizar pelo impacto real).
  const vendasPorNome = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pedidos) {
      if (p.status === "Cancelado") continue;
      const nome = (p as Pedido & { produto?: string }).produto?.trim().toLowerCase();
      if (!nome) continue;
      map[nome] = (map[nome] ?? 0) + 1;
    }
    return map;
  }, [pedidos]);

  const problemas = useMemo(() => {
    return produtos
      .filter((p) => p.custo > 0 && p.margemPct < minima)
      .map((p) => {
        const precoAtual = p.custo * (1 + p.margemPct / 100);
        const precoSugerido = p.custo * (1 + alvo / 100);
        const vendas = vendasPorNome[p.nome.trim().toLowerCase()] ?? 0;
        const perdaUnit = precoSugerido - precoAtual;
        const impacto = perdaUnit * Math.max(vendas, 1);
        return { ...p, precoAtual, precoSugerido, vendas, perdaUnit, impacto };
      })
      .sort((a, b) => b.impacto - a.impacto)
      .slice(0, 10);
  }, [produtos, alvo, minima, vendasPorNome]);

  const perdaTotal = problemas.reduce((s, p) => s + p.impacto, 0);

  if (!unlimited) return null;

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold">
            Auditoria de preços
          </p>
          <p className="text-sm text-muted-foreground">
            Produtos com margem abaixo de {minima}% ordenados pelo impacto no seu lucro, com o
            preço recomendado para chegar a {alvo}%.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-secondary/40 p-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Margem alvo</span>
          <select
            value={alvo}
            onChange={(e) => setAlvo(Number(e.target.value))}
            className="rounded-full border border-border/70 bg-background px-3 py-1"
          >
            {OPCOES_ALVO.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Alertar abaixo de</span>
          <select
            value={minima}
            onChange={(e) => setMinima(Number(e.target.value))}
            className="rounded-full border border-border/70 bg-background px-3 py-1"
          >
            {[15, 20, 25, 30, 40, 50].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
      </div>

      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre produtos com custo e margem para receber a análise.
        </p>
      ) : problemas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum produto abaixo de {minima}% de margem. Seus preços estão saudáveis. 🎉
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-primary/10 p-3 text-sm">
            Corrigindo esses preços você deixaria de perder cerca de{" "}
            <strong>{brl(perdaTotal)}</strong> considerando o histórico de vendas.
          </div>
          <div className="space-y-2">
            {problemas.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <strong className="min-w-0 flex-1 truncate">{p.nome}</strong>
                  {p.vendas > 0 && (
                    <Badge variant="secondary" className="rounded-full">
                      {p.vendas} venda{p.vendas > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <Badge variant="destructive" className="rounded-full">
                    margem {p.margemPct.toFixed(0)}%
                  </Badge>
                </div>
                <p className="mt-1.5 text-muted-foreground">
                  Hoje você vende por {brl(p.precoAtual)}. Recomendamos vender por{" "}
                  <strong className="text-foreground">{brl(p.precoSugerido)}</strong> (+
                  {brl(p.perdaUnit)} por unidade) para manter {alvo}% de margem.
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function GanhoPorHora() {
  const [sessoes] = useLocalState<SessaoProducao[]>("lcp:cronometro:sessoes", []);
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);

  const hojeStr = new Date().toDateString();

  const minutosHoje = useMemo(
    () =>
      sessoes
        .filter((s) => new Date(s.data).toDateString() === hojeStr)
        .reduce((sum, s) => sum + s.minutos, 0),
    [sessoes, hojeStr],
  );

  const margemMedia = useMemo(() => {
    const v = produtos.filter((p) => p.margemPct > 0);
    if (!v.length) return 0;
    return v.reduce((s, p) => s + p.margemPct, 0) / v.length;
  }, [produtos]);

  const faturamentoHoje = useMemo(
    () =>
      pedidos
        .filter(
          (p) =>
            p.status !== "Cancelado" &&
            p.entrega &&
            new Date(p.entrega).toDateString() === hojeStr,
        )
        .reduce((s, p) => s + (p.valor || 0) + (p.valorEntrega || 0), 0),
    [pedidos, hojeStr],
  );

  const lucroHoje = faturamentoHoje * (margemMedia / 100);
  const horas = minutosHoje / 60;
  const lucroHora = horas > 0 ? lucroHoje / horas : 0;

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-base font-semibold">
            Quanto você ganhou trabalhando hoje?
          </p>
          <p className="text-sm text-muted-foreground">
            Baseado no cronômetro de produção e nos pedidos entregues hoje.
          </p>
        </div>
      </div>

      {minutosHoje === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum tempo cronometrado hoje. Use o Cronômetro de Produção para medir suas horas.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trabalhou</p>
            <p className="font-display text-xl font-semibold">{humanMin(minutosHoje)}</p>
          </div>
          <div className="rounded-2xl bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lucro do dia</p>
            <p className="font-display text-xl font-semibold">{brl(lucroHoje)}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lucro por hora</p>
            <p className="font-display text-xl font-semibold">{brl(lucroHora)}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
