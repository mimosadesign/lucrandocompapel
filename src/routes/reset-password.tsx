import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — Lucrando com Papel" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase troca o link de recovery por uma sessão temporária.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Link expirado. Solicite um novo e-mail de recuperação.");
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().min(8, "Mínimo 8 caracteres").max(72).safeParse(senha);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha redefinida!");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-md rounded-3xl border-border/60 p-8 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="font-display text-lg font-semibold">Nova senha</p>
        </div>
        <h2 className="font-display text-2xl font-semibold">Redefinir senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma nova senha para acessar sua conta.
        </p>
        {ready && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nova senha</Label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
