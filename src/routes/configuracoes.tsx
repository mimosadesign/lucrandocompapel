import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Lock, LogOut, Palette } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Lucrando com Papel" }] }),
  component: ConfigPage,
});

const items = [
  { icon: Bell, title: "Notificações de pedido", desc: "Alertar 1, 2 ou 3 dias antes da entrega (sonoras)" },
  { icon: Palette, title: "Aparência do app", desc: "Personalize cores (Diamante)", diamond: true },
  { icon: Lock, title: "Segurança da conta", desc: "Alterar senha e e-mail" },
];

function ConfigPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Ajustes do app, notificações e da sua conta."
      />

      <Card className="rounded-3xl border-border/60 divide-y divide-border/60 shadow-[var(--shadow-card)] overflow-hidden">
        {items.map((it) => (
          <div key={it.title} className="flex items-center gap-4 p-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
              <it.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{it.title}</p>
                {it.diamond && (
                  <span className="rounded-full bg-diamond/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                    💎
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{it.desc}</p>
            </div>
            <Switch />
          </div>
        ))}
      </Card>

      <div className="mt-6 flex justify-between items-center">
        <Button variant="ghost" className="rounded-full text-destructive gap-2">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
        <Link
          to="/auth"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
