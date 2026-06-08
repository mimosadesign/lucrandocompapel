import { useState } from "react";
import { Gem, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const benefits = [
  "Materiais, produtos, pedidos e catálogo ilimitados",
  "Personalização visual das cores do app",
  "Faturamento mensal com metas e confetes 🎉",
  "Dashboard executivo com score de saúde",
  "Inteligência financeira: break-even, cenários, simuladores",
  "Mentora financeira com alertas inteligentes",
  "Fila de produção (kanban)",
  "Orçamentos em PDF e compartilhamento via WhatsApp",
  "Histórico de clientes e ranking de lucratividade",
  "Kits, combos e múltiplos fornecedores",
  "Gestão de estoque com previsão de falta",
  "Relatórios e exportação de dados",
];

export function DiamondButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Conhecer o Plano Diamante"
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-diamond/90 to-diamond px-4 py-2 text-sm font-medium text-diamond-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
        >
          <Gem className="h-4 w-4" />
          <span className="hidden sm:inline">Diamante</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl border-0 bg-card shadow-2xl">
        <DialogHeader className="text-center items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-diamond/30 to-diamond mb-2">
            <Gem className="h-7 w-7 text-foreground" />
          </div>
          <DialogTitle className="font-display text-2xl">
            Desbloqueie todo o potencial do seu ateliê
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Plano Diamante — <span className="font-semibold text-foreground">R$ 30,00/mês</span>
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2.5 py-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <Button size="lg" className="rounded-full gap-2">
            <Sparkles className="h-4 w-4" />
            Assinar Diamante
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Continuar no plano gratuito
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
