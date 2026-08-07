import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalState, readLocal, writeLocal, brl } from "@/lib/storage";
import { useIsUnlimited } from "@/lib/auth";

export type PrecoHistorico = {
  id: string;
  materialId: string;
  nome: string;
  unitario: number;
  data: string;
};

export const HISTORICO_KEY = "lcp:materiais:historico";

/** Registra o custo unitário do material quando ele muda. */
export function registrarPreco(materialId: string, nome: string, unitario: number) {
  if (typeof window === "undefined" || !isFinite(unitario) || unitario <= 0) return;
  const lista = readLocal<PrecoHistorico[]>(HISTORICO_KEY, []);
  const ultimo = [...lista].reverse().find((h) => h.materialId === materialId);
  if (ultimo && Math.abs(ultimo.unitario - unitario) < 0.0001) return;
  lista.push({
    id: crypto.randomUUID(),
    materialId,
    nome,
    unitario,
    data: new Date().toISOString(),
  });
  writeLocal(HISTORICO_KEY, lista.slice(-500));
}

/** Alerta de aumento de custos + custo médio atualizado por material (Diamante). */
export function AlertasCusto() {
  const [historico] = useLocalState<PrecoHistorico[]>(HISTORICO_KEY, []);
  const unlimited = useIsUnlimited();


  const linhas = useMemo(() => {
    const porMaterial: Record<string, PrecoHistorico[]> = {};
    for (const h of historico) {
      (porMaterial[h.materialId] ||= []).push(h);
    }
    return Object.values(porMaterial)
      .map((regs) => {
        const ordenado = [...regs].sort((a, b) => a.data.localeCompare(b.data));
        const atual = ordenado[ordenado.length - 1];
        const anterior = ordenado[ordenado.length - 2];
        const media =
          ordenado.reduce((s, r) => s + r.unitario, 0) / ordenado.length;
        const variacao = anterior
          ? ((atual.unitario - anterior.unitario) / anterior.unitario) * 100
          : 0;
        return { nome: atual.nome, atual: atual.unitario, anterior, media, variacao };
      })
      .filter((l) => l.anterior)
      .sort((a, b) => b.variacao - a.variacao);
  }, [historico]);

  const aumentos = linhas.filter((l) => l.variacao >= 5);

  if (!unlimited || linhas.length === 0) return null;

  return (
    <Card className="mb-6 rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="font-display text-base font-semibold">
          Custo médio e alertas de aumento
        </p>
      </div>
      {aumentos.length > 0 && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-sm">
          ⚠️ {aumentos.length} material(is) subiram de preço. Reveja a precificação dos
          produtos que usam esses insumos.
        </p>
      )}
      <div className="space-y-1.5">
        {linhas.slice(0, 8).map((l) => (
          <div key={l.nome} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <strong>{l.nome}</strong>
              <span className="text-muted-foreground">
                {" "}
                · atual {brl(l.atual)} · médio {brl(l.media)}
              </span>
            </span>
            <Badge
              variant={l.variacao >= 5 ? "destructive" : "secondary"}
              className="rounded-full"
            >
              {l.variacao >= 0 ? "+" : ""}
              {l.variacao.toFixed(1)}%
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
