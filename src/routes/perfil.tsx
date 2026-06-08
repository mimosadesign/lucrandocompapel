import { createFileRoute } from "@tanstack/react-router";
import { Camera, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil do Ateliê — Lucrando com Papel" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Perfil do Ateliê"
        description="Personalize a identidade do seu negócio. Esses dados aparecem no catálogo e nos orçamentos."
      />

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="flex flex-col items-center gap-4 border-b border-border/60 pb-8 md:flex-row md:items-start md:gap-6">
          <button className="group relative grid h-28 w-28 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent">
            <Camera className="h-7 w-7" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Trocar foto
            </span>
          </button>
          <div className="text-center md:text-left">
            <h2 className="font-display text-xl font-semibold">Foto / logo do ateliê</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use uma imagem quadrada de pelo menos 400×400 px. PNG ou JPG.
            </p>
          </div>
        </div>

        <div className="grid gap-5 pt-8 md:grid-cols-2">
          <Field label="Nome do ateliê" placeholder="Ex: Ateliê da Bia" />
          <Field label="Tempo de atuação" placeholder="Ex: 2 anos e 3 meses" />
          <Field
            label="WhatsApp do ateliê"
            placeholder="(11) 99999-9999"
            help="Usado no botão de finalização do catálogo"
          />
          <Field label="Cidade / Estado" placeholder="Ex: São Paulo, SP" />
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full border-foreground/20">
            Cancelar
          </Button>
          <Button className="rounded-full gap-2">
            <Save className="h-4 w-4" /> Salvar perfil
          </Button>
        </div>
      </Card>

      <Card className="mt-6 rounded-3xl border-diamond/30 bg-gradient-to-br from-diamond/5 to-transparent p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-diamond/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
            💎 Diamante
          </span>
          <h3 className="font-display text-lg font-semibold">Personalização visual</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Adapte as cores do app à identidade visual do seu ateliê.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          {["Fundo", "Destaque", "Texto", "Botões"].map((l) => (
            <div key={l} className="rounded-2xl border border-border/60 bg-card p-3 opacity-60">
              <p className="text-xs text-muted-foreground">{l}</p>
              <div className="mt-2 h-10 rounded-xl border border-border/60 bg-secondary" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, placeholder, help }: { label: string; placeholder?: string; help?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input placeholder={placeholder} className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4" />
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
