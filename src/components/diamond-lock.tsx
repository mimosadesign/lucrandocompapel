import { Gem, Lock, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openDiamondDialog, useDiamondPreview } from "@/lib/auth";
import type { ReactNode } from "react";

interface DiamondLockProps {
  title: string;
  description: string;
  preview?: ReactNode;
}

export function DiamondLock({ title, description, preview }: DiamondLockProps) {
  const [previewOn, setPreviewOn] = useDiamondPreview();

  if (previewOn) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-diamond/40 bg-diamond/10 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-diamond-foreground" />
            <span>
              <strong>Modo de teste Diamante ativo</strong> — você está pré-visualizando um recurso pago.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full gap-1"
            onClick={() => setPreviewOn(false)}
          >
            <EyeOff className="h-3.5 w-3.5" /> Desativar
          </Button>
        </Card>
        {preview ?? (
          <Card className="rounded-3xl border-border/60 p-10 text-center shadow-[var(--shadow-card)]">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Esta é uma pré-visualização do recurso. Os dados reais aparecerão aqui após a assinatura.
            </p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl border border-diamond/30 bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-diamond/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-diamond/50 to-diamond shadow-lg">
            <Gem className="h-8 w-8 text-diamond-foreground" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold md:text-3xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            {description}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Recurso ilimitado do Plano Diamante — R$ 35,00/mês
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="lg" className="rounded-full gap-2" onClick={openDiamondDialog}>
              <Sparkles className="h-4 w-4" />
              Assinar Diamante
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-foreground/20"
              onClick={openDiamondDialog}
            >
              Ver todos os benefícios
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full gap-2"
              onClick={() => setPreviewOn(true)}
            >
              <Eye className="h-4 w-4" />
              Pré-visualizar (teste)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
