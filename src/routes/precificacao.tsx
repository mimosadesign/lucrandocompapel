import { createFileRoute } from "@tanstack/react-router";
import { Clock, Wallet, Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/precificacao")({
  head: () => ({ meta: [{ title: "Precificação e Custos — Lucrando com Papel" }] }),
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Precificação e Custos"
        description="Configure suas horas, faturamento esperado e gastos fixos. Todos os cálculos são automáticos."
      />

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle icon={<Clock className="h-4 w-4" />} title="2.1 — Dados de trabalho" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Horas trabalhadas por dia" placeholder="8" suffix="h" />
          <Field label="Dias trabalhados por mês" placeholder="22" suffix="dias" />
          <Field
            label="Pró-labore"
            placeholder="R$ 2.500,00"
            help="Seu salário mensal no ateliê ou o que pretende ganhar"
          />
          <Field label="Valor com funcionário (mensal)" placeholder="R$ 0,00" />
          <Field label="Reserva de férias (mensal)" placeholder="R$ 0,00" />
          <Field label="Despesas gerais" placeholder="R$ 0,00" />
          <Field label="Transporte" placeholder="R$ 0,00" />
          <Field label="Alimentação" placeholder="R$ 0,00" />
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle icon={<Wallet className="h-4 w-4" />} title="2.2 — Faturamento esperado" />
        <p className="mb-4 text-sm text-muted-foreground">
          Informe seu faturamento bruto dos últimos 5 meses para calcular sua meta média.
        </p>
        <div className="grid gap-3 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((m) => (
            <Field key={m} label={`Mês ${m}`} placeholder="R$ 0,00" />
          ))}
        </div>
        <ResultCard label="Meta de faturamento mensal" value="R$ 4.800,00" />
      </Card>

      <Card className="rounded-3xl border-primary/30 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          2.3 — Cálculo automático
        </p>
        <p className="mt-2 font-display text-3xl font-semibold">
          Valor da sua hora de trabalho: <span className="text-primary">R$ 28,50</span>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 max-w-md">
          <Field label="Minutos de produção" placeholder="60" suffix="min" />
          <div className="flex items-end">
            <div className="w-full rounded-2xl bg-card p-3 text-sm">
              <p className="text-xs text-muted-foreground">Custo de mão de obra</p>
              <p className="font-display text-lg font-semibold">R$ 28,50</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <SectionTitle title="2.4 — Gastos fixos mensais" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {["Tinta", "Internet", "Água", "Luz", "Gasolina", "Parcela de cartão", "Plataformas IA / design"].map(
            (l) => (
              <Field key={l} label={l} placeholder="R$ 0,00" />
            )
          )}
        </div>
        <Button variant="outline" className="mt-4 rounded-full gap-2 border-foreground/20">
          <Plus className="h-4 w-4" /> Adicionar outro gasto fixo
        </Button>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <ResultCard label="Total gasto fixo mensal" value="R$ 0,00" compact />
          <ResultCard label="Custo fixo por dia" value="R$ 0,00" compact />
          <ResultCard label="Custo fixo por item" value="R$ 0,00" compact />
        </div>
        <div className="mt-4 max-w-sm">
          <Field label="Itens produzidos por dia (média)" placeholder="10" />
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
            <span className="font-display text-2xl font-semibold">10%</span>
          </div>
          <Slider defaultValue={[10]} min={5} max={15} step={1} className="mt-3" />
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
}: {
  label: string;
  placeholder?: string;
  help?: string;
  suffix?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          placeholder={placeholder}
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

function ResultCard({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div
      className={`mt-${compact ? "0" : "6"} rounded-2xl border border-primary/30 bg-primary/10 p-4`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
