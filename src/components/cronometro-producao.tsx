import { useEffect, useRef, useState } from "react";
import { Timer, Play, Square, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalState } from "@/lib/storage";

export type SessaoProducao = {
  id: string;
  nome: string;
  minutos: number;
  data: string;
};

function fmt(totalSeg: number) {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function humanMin(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}min` : `${m}min`;
}

export function CronometroProducao({
  nomeSugerido,
  onUsarTempo,
}: {
  nomeSugerido?: string;
  onUsarTempo?: (minutos: number) => void;
}) {
  const [sessoes, setSessoes] = useLocalState<SessaoProducao[]>(
    "lcp:cronometro:sessoes",
    [],
  );
  const [nome, setNome] = useState(nomeSugerido ?? "");
  const [inicio, setInicio] = useState<number | null>(null);
  const [seg, setSeg] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (inicio === null) return;
    tick.current = setInterval(() => {
      setSeg(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [inicio]);

  function iniciar() {
    setSeg(0);
    setInicio(Date.now());
  }

  function parar() {
    if (inicio === null) return;
    const minutos = Math.max(1, Math.round((Date.now() - inicio) / 60000));
    const registro: SessaoProducao = {
      id: crypto.randomUUID(),
      nome: nome.trim() || nomeSugerido || "Produção",
      minutos,
      data: new Date().toISOString(),
    };
    setSessoes([registro, ...sessoes].slice(0, 200));
    setInicio(null);
    setSeg(0);
    toast.success(`Tempo real registrado: ${humanMin(minutos)}`);
  }

  const ultima = sessoes[0];

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Timer className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold">Cronômetro de Produção</p>
          <p className="text-sm text-muted-foreground">
            Inicie ao começar a produzir. Ao terminar, o tempo real fica salvo e pode ser
            usado direto na precificação.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="O que você está produzindo?"
          className="h-11 rounded-full border-border/70 bg-background px-4"
        />
        <div className="font-display text-2xl font-semibold tabular-nums">{fmt(seg)}</div>
        {inicio === null ? (
          <Button className="h-11 rounded-full gap-2" onClick={iniciar}>
            <Play className="h-4 w-4" /> Iniciar produção
          </Button>
        ) : (
          <Button variant="destructive" className="h-11 rounded-full gap-2" onClick={parar}>
            <Square className="h-4 w-4" /> Terminei
          </Button>
        )}
      </div>

      {ultima ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-primary/5 p-3 text-sm">
          <span>
            Último tempo real: <strong>{humanMin(ultima.minutos)}</strong> em {ultima.nome}
          </span>
          {onUsarTempo ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5 border-foreground/20"
              onClick={() => {
                onUsarTempo(ultima.minutos);
                toast.success("Tempo real aplicado neste item.");
              }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Usar na precificação
            </Button>
          ) : null}
        </div>
      ) : null}

      {sessoes.length > 1 ? (
        <div className="space-y-1.5">
          {sessoes.slice(1, 6).map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{s.nome}</span>
              <span className="text-muted-foreground">
                {new Date(s.data).toLocaleDateString("pt-BR")}
              </span>
              <strong className="tabular-nums">{humanMin(s.minutos)}</strong>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-destructive"
                onClick={() => setSessoes(sessoes.filter((x) => x.id !== s.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
