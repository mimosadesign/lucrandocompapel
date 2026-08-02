import { useMemo } from "react";
import { AlertTriangle, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalState, brl } from "@/lib/storage";
import { humanMin, type SessaoProducao } from "@/components/cronometro-producao";

type Produto = { id: string; nome: string; custo: number; margemPct: number };
type Pedido = {
  id: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
};

const MARGEM_ALVO = 60;
const MARGEM_MINIMA = 30;

export function AuditoriaPrecos() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);

  const problemas = useMemo(() => {
    return produtos
      .filter((p) => p.custo > 0 && p.margemPct < MARGEM_MINIMA)
      .map((p) => {
        const precoAtual = p.custo * (1 + p.margemPct / 100);
        const precoSugerido = p.custo * (1 + MARGEM_ALVO / 100);
        return { ...p, precoAtual, precoSugerido };
      })
      .sort((a, b) => a.margemPct - b.margemPct)
      .slice(0, 8);
  }, [produtos]);

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-base font-semibold">
            Análise de produtos mal precificados
          </p>
          <p className="text-sm text-muted-foreground">
            Produtos com margem abaixo de {MARGEM_MINIMA}% e o preço recomendado para chegar a{" "}
            {MARGEM_ALVO}%.
          </p>
        </div>
      </div>

      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre produtos com custo e margem para receber a análise.
        </p>
      ) : problemas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum produto abaixo de {MARGEM_MINIMA}% de margem. Seus preços estão saudáveis. 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {problemas.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <strong className="min-w-0 flex-1 truncate">{p.nome}</strong>
                <Badge variant="destructive" className="rounded-full">
                  margem {p.margemPct.toFixed(0)}%
                </Badge>
              </div>
              <p className="mt-1.5 text-muted-foreground">
                Hoje você vende por {brl(p.precoAtual)}. Recomendamos vender por{" "}
                <strong className="text-foreground">{brl(p.precoSugerido)}</strong> para manter{" "}
                {MARGEM_ALVO}% de margem.
              </p>
            </div>
          ))}
        </div>
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
