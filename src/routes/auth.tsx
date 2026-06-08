import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Lucrando com Papel" }] }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/30 via-accent/40 to-diamond/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-diamond/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="font-display text-xl font-semibold">Lucrando com Papel</p>
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Transforme sua paixão por papelaria em um negócio lucrativo.
          </h1>
          <p className="mt-4 max-w-md text-sm text-foreground/80">
            Precificação inteligente, controle de pedidos, faturamento mensal e uma
            mentora financeira sempre ao seu lado. Tudo num app só, bonito e fácil de usar.
          </p>
        </div>
        <p className="relative text-xs text-foreground/60">
          © {new Date().getFullYear()} Lucrando com Papel
        </p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md rounded-3xl border-border/60 p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">Entrar no seu ateliê</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bem-vinda de volta — vamos cuidar do seu lucro hoje.
          </p>

          <Button variant="outline" className="mt-6 w-full rounded-full h-11 gap-2 border-foreground/20">
            <span aria-hidden>🟦</span> Continuar com Google
          </Button>

          <div className="relative my-6 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-3">ou com e-mail</span>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-border/60" />
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                E-mail
              </Label>
              <Input
                type="email"
                placeholder="voce@email.com"
                className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Senha
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
              />
            </div>
            <Button asChild className="w-full rounded-full h-11">
              <Link to="/">Entrar</Link>
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <button className="font-medium text-foreground underline-offset-4 hover:underline">
              Criar conta
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
