import { useEffect, useState } from "react";
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
import { useEntitlement } from "@/lib/auth";
import { toast } from "sonner";

const benefits = [
  "Materiais, produtos, pedidos e catálogo ilimitados",
  "Personalização visual ilimitada das cores do app",
  "Faturamento mensal ilimitado com metas e confetes 🎉",
  "Dashboard executivo com score de saúde",
  "Inteligência financeira: break-even, cenários e simuladores",
  "Mentora financeira com alertas inteligentes",
  "Fila de produção em kanban",
  "Orçamentos em PDF e compartilhamento via WhatsApp",
  "Histórico de clientes e ranking de lucratividade",
  "Kits, combos e múltiplos fornecedores ilimitados",
  "Gestão de estoque com previsão de falta",
  "Relatórios e exportação de dados ilimitados",
];

export function DiamondButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { inTrial, daysLeft, isPaid } = useEntitlement();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("lcp:open-diamond", onOpen);
    return () => window.removeEventListener("lcp:open-diamond", onOpen);
  }, []);

  async function assinar() {
    try {
      setLoading(true);
      window.location.href = "/assinar";
    } catch {
      toast.error("Não foi possível iniciar a assinatura. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label={isPaid ? "Plano Diamante ativo" : "Conhecer o Plano Diamante"}
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-diamond/90 to-diamond px-4 py-2 text-sm font-medium text-diamond-foreground shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
        >
          <Gem className="h-4 w-4" />
          <span className="hidden sm:inline">{isPaid ? "Diamante ativo" : "Diamante"}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl border-0 bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-diamond/40 to-diamond mb-2">
            <Gem className="h-7 w-7 text-diamond-foreground" />
          </div>
          <DialogTitle className="font-display text-2xl">
            {isPaid ? "Você está no Plano Diamante 💎" : "Desbloqueie todo o potencial do seu ateliê"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {isPaid
              ? "Aproveite todos os recursos ilimitados."
              : <>Plano Diamante — <span className="font-semibold text-foreground">R$ 35,00/mês</span> · todos os recursos <span className="font-semibold text-foreground">ilimitados</span></>}
          </DialogDescription>
          {!isPaid && inTrial && (
            <p className="text-xs rounded-full bg-primary/15 px-3 py-1 text-foreground">
              🎁 Você ainda tem {daysLeft} {daysLeft === 1 ? "dia" : "dias"} de teste grátis
            </p>
          )}
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
          {!isPaid && (
            <Button size="lg" className="rounded-full gap-2" onClick={assinar} disabled={loading}>
              <Sparkles className="h-4 w-4" />
              {loading ? "Carregando..." : "Assinar Diamante por R$ 35,00/mês"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
