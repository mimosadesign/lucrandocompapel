import { Gem, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiamondLockProps {
  title: string;
  description: string;
}

export function DiamondLock({ title, description }: DiamondLockProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl border border-diamond/30 bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-diamond/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond shadow-lg">
            <Gem className="h-8 w-8 text-foreground" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold md:text-3xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            {description}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Recurso exclusivo do Plano Diamante — R$ 30,00/mês
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="lg" className="rounded-full gap-2">
              <Sparkles className="h-4 w-4" />
              Assinar Diamante
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-foreground/20">
              Ver todos os benefícios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
