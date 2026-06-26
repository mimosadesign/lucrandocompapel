import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Clock, Wallet, Plus, AlertTriangle, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLocalState } from "@/lib/storage";

export const Route = createFileRoute("/precificacao")({
  head: () => ({ meta: [{ title: "Precificação e Custos — Lucrando com Papel" }] }),
  component: PrecificacaoPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type NumState = Record<string, string>;

function num(v: string | undefined) {
  if (!v) return 0;
  const n = parseFloat(v.toString().replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function PrecificacaoPage() {
  // 2.1 Trabalho
  const [trabalho, setTrabalho] = useLocalState<NumState>("lcp:precif:trabalho", {
    horasDia: "",
    diasMes: "",
    proLabore: "",
    funcionario: "",
    ferias: "",
    despesas: "",
    transporte: "",
    alimentacao: "",
  });

  // 2.2 Faturamento
  const [faturamento, setFaturamento] = useLocalState<NumState>("lcp:precif:faturamento", {
    m1: "",
    m2: "",
    m3: "",
    m4: "",
    m5: "",
  });

  // 2.3 Minutos de produção
  const [minutos, setMinutos] = useLocalState<string>("lcp:precif:minutos", "");

  // 2.4 Gastos fixos
  type Gasto = { id: string; nome: string; valor: string };
  const [gastos, setGastos] = useLocalState<Gasto[]>("lcp:precif:gastos", [
    { id: "tinta", nome: "Tinta", valor: "" },
    { id: "internet", nome: "Internet", valor: "" },
    { id: "agua", nome: "Água", valor: "" },
    { id: "luz", nome: "Luz", valor: "" },
    { id: "gasolina", nome: "Gasolina", valor: "" },
    { id: "cartao", nome: "Parcela de cartão", valor: "" },
    { id: "ia", nome: "Plataformas IA / design", valor: "" },
  ]);
  const [itensDia, setItensDia] = useLocalState<string>("lcp:precif:itensDia", "");

  // 2.5 Imprevistos
  const [imprevistos, setImprevistos] = useLocalState<number>("lcp:precif:imprevistos", 10);

  // ===== Cálculos =====
  const metaFaturamento = useMemo(() => {
    const vals = [
      num(faturamento.m1),
      num(faturamento.m2),
      num(faturamento.m3),
      num(faturamento.m4),
      num(faturamento.m5),
    ].filter((v) => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [faturamento]);

  const totalCustoMensal = useMemo(() => {
    return (
      num(trabalho.proLabore) +
      num(trabalho.funcionario) +
      num(trabalho.ferias) +
      num(trabalho.despesas) +
      num(trabalho.transporte) +
      num(trabalho.alimentacao)
    );
  }, [trabalho]);

  const horasMes = num(trabalho.horasDia) * num(trabalho.diasMes);

  const valorHora = useMemo(() => {
    if (horasMes <= 0) return 0;
    return totalCustoMensal / horasMes;
  }, [totalCustoMensal, horasMes]);

  const custoMaoDeObra = useMemo(() => {
    return (valorHora / 60) * num(minutos);
  }, [valorHora, minutos]);

  const totalGastoFixo = useMemo(
    () => gastos.reduce((acc, g) => acc + num(g.valor), 0),
    [gastos]
  );
  const dias = num(trabalho.diasMes) || 0;
  const custoFixoDia = dias > 0 ? totalGastoFixo / dias : 0;
  const custoFixoItem = num(itensDia) > 0 ? custoFixoDia / num(itensDia) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Precificação e Custos"
        description="Configure suas horas, faturamento esperado e gastos fixos. Todos os cálculos são automáticos."
      />

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle icon={<Clock className="h-4 w-4" />} title="2.1 — Dados de trabalho" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Horas trabalhadas por dia"
            placeholder="Ex: 8"
            suffix="h"
            value={trabalho.horasDia}
            onChange={(v) => setTrabalho({ ...trabalho, horasDia: v })}
          />
          <Field
            label="Dias trabalhados por mês"
            placeholder="Ex: 22"
            suffix="dias"
            value={trabalho.diasMes}
            onChange={(v) => setTrabalho({ ...trabalho, diasMes: v })}
          />
          <Field
            label="Pró-labore"
            placeholder="R$ 0,00"
            help="Seu salário mensal no ateliê ou o que pretende ganhar"
            value={trabalho.proLabore}
            onChange={(v) => setTrabalho({ ...trabalho, proLabore: v })}
          />
          <Field
            label="Valor com funcionário (mensal)"
            placeholder="R$ 0,00"
            value={trabalho.funcionario}
            onChange={(v) => setTrabalho({ ...trabalho, funcionario: v })}
          />
          <Field
            label="Reserva de férias (mensal)"
            placeholder="R$ 0,00"
            value={trabalho.ferias}
            onChange={(v) => setTrabalho({ ...trabalho, ferias: v })}
          />
          <Field
            label="Despesas gerais"
            placeholder="R$ 0,00"
            value={trabalho.despesas}
            onChange={(v) => setTrabalho({ ...trabalho, despesas: v })}
          />
          <Field
            label="Transporte"
            placeholder="R$ 0,00"
            value={trabalho.transporte}
            onChange={(v) => setTrabalho({ ...trabalho, transporte: v })}
          />
          <Field
            label="Alimentação"
            placeholder="R$ 0,00"
            value={trabalho.alimentacao}
            onChange={(v) => setTrabalho({ ...trabalho, alimentacao: v })}
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle icon={<Wallet className="h-4 w-4" />} title="2.2 — Faturamento esperado" />
        <p className="mb-4 text-sm text-muted-foreground">
          Informe seu faturamento bruto dos últimos 5 meses para calcular sua meta média.
        </p>
        <div className="grid gap-3 sm:grid-cols-5">
          {([1, 2, 3, 4, 5] as const).map((m) => (
            <Field
              key={m}
              label={`Mês ${m}`}
              placeholder="R$ 0,00"
              value={faturamento[`m${m}`]}
              onChange={(v) => setFaturamento({ ...faturamento, [`m${m}`]: v })}
            />
          ))}
        </div>
        <ResultCard label="Meta de faturamento mensal" value={BRL(metaFaturamento)} />
      </Card>

      <Card className="rounded-3xl border-primary/30 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          2.3 — Cálculo automático
        </p>
        <p className="mt-2 font-display text-3xl font-semibold">
          Valor da sua hora de trabalho:{" "}
          <span className="text-primary">{BRL(valorHora)}</span>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 max-w-md">
          <Field
            label="Minutos de produção"
            placeholder="Ex: 60"
            suffix="min"
            value={minutos}
            onChange={setMinutos}
          />
          <div className="flex items-end">
            <div className="w-full rounded-2xl bg-card p-3 text-sm">
              <p className="text-xs text-muted-foreground">Custo de mão de obra</p>
              <p className="font-display text-lg font-semibold">{BRL(custoMaoDeObra)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle title="2.4 — Gastos fixos mensais" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {gastos.map((g, idx) => (
            <div key={g.id} className="relative">
              <Field
                label={g.nome}
                placeholder="R$ 0,00"
                value={g.valor}
                onChange={(v) => {
                  const copy = [...gastos];
                  copy[idx] = { ...g, valor: v };
                  setGastos(copy);
                }}
              />
              {idx >= 7 && (
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => setGastos(gastos.filter((x) => x.id !== g.id))}
                  className="absolute -top-1 right-0 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-4 rounded-full gap-2 border-foreground/20"
          onClick={() =>
            setGastos([
              ...gastos,
              { id: `custom-${Date.now()}`, nome: "Novo gasto", valor: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Adicionar outro gasto fixo
        </Button>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <ResultCard label="Total gasto fixo mensal" value={BRL(totalGastoFixo)} compact />
          <ResultCard label="Custo fixo por dia" value={BRL(custoFixoDia)} compact />
          <ResultCard label="Custo fixo por item" value={BRL(custoFixoItem)} compact />
        </div>
        <div className="mt-4 max-w-sm">
          <Field
            label="Itens produzidos por dia (média)"
            placeholder="Ex: 10"
            value={itensDia}
            onChange={setItensDia}
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-warning/40 bg-warning/5 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          title="2.5 — Reserva de imprevistos"
        />
        <p className="text-sm text-muted-foreground">
          Inclua essa margem para cobrir retrabalhos, erros e aumento de preços.
        </p>
        <div className="mt-6 max-w-md">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              % de imprevistos
            </Label>
            <span className="font-display text-2xl font-semibold">{imprevistos}%</span>
          </div>
          <Slider
            value={[imprevistos]}
            onValueChange={(v) => setImprevistos(v[0])}
            min={5}
            max={15}
            step={1}
            className="mt-3"
          />
          <p className="mt-2 text-xs text-muted-foreground">Sugerido entre 5% e 15%</p>
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {icon && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-foreground">
          {icon}
        </span>
      )}
      <h2 className="font-display text-lg font-semibold">{title}</h2>
    </div>
  );
}

function Field({
  label,
  placeholder,
  help,
  suffix,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  help?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-full border-border/70 bg-background px-4 pr-12"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function ResultCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "" : "mt-6"} rounded-2xl border border-primary/30 bg-primary/10 p-4`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
