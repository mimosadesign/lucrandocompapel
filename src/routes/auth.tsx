import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Lucrando com Papel" }] }),
  component: AuthPage,
});

const signupSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(8, "Senha precisa ter ao menos 8 caracteres").max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(1, "Informe a senha").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login" | "forgot">("signup");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, manda para o início.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/", replace: true });
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ nome, email, senha });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome: parsed.data.nome },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Conta criada! Seu teste grátis de 25 dias começou 💚");
        navigate({ to: "/" });
      } else if (mode === "login") {
        const parsed = loginSchema.safeParse({ email, senha });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });
        if (error) {
          toast.error(
            error.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos"
              : error.message,
          );
          return;
        }
        toast.success("Bem-vinda de volta!");
        navigate({ to: "/" });
      } else {
        // forgot
        const parsed = z.string().email().safeParse(email.trim());
        if (!parsed.success) {
          toast.error("Informe um e-mail válido");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? "Crie sua conta"
      : mode === "login"
      ? "Entrar no seu ateliê"
      : "Recuperar senha";

  const subtitle =
    mode === "signup"
      ? "Comece agora — 25 dias de teste grátis, sem cartão."
      : mode === "login"
      ? "Bem-vinda de volta — vamos cuidar do seu lucro hoje."
      : "Informe seu e-mail e enviaremos um link para criar uma nova senha.";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/30 via-accent/60 to-diamond/20 overflow-hidden">
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
            Crie sua conta e teste o app por <strong>25 dias grátis</strong>, com todos
            os recursos liberados. Precificação, pedidos, catálogo e faturamento — tudo num só lugar.
          </p>
        </div>
        <p className="relative text-xs text-foreground/60">
          © {new Date().getFullYear()} Lucrando com Papel
        </p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md rounded-3xl border-border/60 p-6 sm:p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Senha</Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                {mode === "signup" && (
                  <p className="mt-1 text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                )}
              </div>
            )}
            <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
              {loading
                ? "Aguarde..."
                : mode === "signup"
                ? "Criar conta e começar teste de 25 dias"
                : mode === "login"
                ? "Entrar"
                : "Enviar link de redefinição"}
            </Button>
          </form>

          {mode === "login" && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => setMode("forgot")}
              >
                Esqueci minha senha
              </button>
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Entrar
                </button>
              </>
            ) : mode === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Lembrou da senha?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Voltar para login
                </button>
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
