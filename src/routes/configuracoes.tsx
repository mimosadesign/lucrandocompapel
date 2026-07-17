import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreditCard, Lock, LogOut, Mail, KeyRound, Gem } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUser, useEntitlement, signOutEverywhere } from "@/lib/auth";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Lucrando com Papel" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isPaid, sub, daysLeft, inTrial, isLifetime } = useEntitlement();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function handleLogout() {
    await signOutEverywhere();
    toast.success("Você saiu da conta.");
    navigate({ to: "/auth", replace: true });
  }

  async function handleUpdateEmail() {
    const parsed = z.string().email().safeParse(newEmail.trim());
    if (!parsed.success) {
      toast.error("E-mail inválido");
      return;
    }
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: parsed.data });
    setLoadingEmail(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de confirmação para o novo e-mail.");
    setNewEmail("");
  }

  async function handleUpdatePassword() {
    const parsed = z.string().min(8, "Mínimo 8 caracteres").safeParse(newPassword);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    setLoadingPass(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setLoadingPass(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    setNewPassword("");
  }

  async function handleOpenPortal() {
    setLoadingPortal(true);
    try {
      const result = await createPortalSession({
        data: {
          returnUrl: `${window.location.origin}/configuracoes`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setLoadingPortal(false);
    }
  }

  const renewDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Configurações"
        description="Ajustes da sua conta, segurança e assinatura."
      />

      {/* Assinatura */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-diamond/20">
            <Gem className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Plano Diamante</p>
            {isLifetime ? (
              <p className="text-sm text-muted-foreground">
                💎 Acesso vitalício ativo — você não paga assinatura e tem todos os recursos liberados para sempre.
              </p>
            ) : isPaid ? (
              <p className="text-sm text-muted-foreground">
                Ativo
                {sub?.cancel_at_period_end ? " (cancelamento agendado)" : ""}
                {renewDate ? ` — próxima cobrança em ${renewDate}` : ""}
              </p>
            ) : inTrial ? (
              <p className="text-sm text-muted-foreground">
                🎁 Você ainda tem {daysLeft} {daysLeft === 1 ? "dia" : "dias"} de teste grátis.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Plano gratuito — assine o Diamante para liberar recursos ilimitados.
              </p>
            )}
          </div>
          {isLifetime ? null : isPaid ? (
            <Button
              variant="outline"
              className="rounded-full border-foreground/20 gap-2"
              onClick={handleOpenPortal}
              disabled={loadingPortal}
            >
              <CreditCard className="h-4 w-4" />
              {loadingPortal ? "Abrindo..." : "Gerenciar assinatura"}
            </Button>
          ) : (
            <Button
              className="rounded-full gap-2"
              onClick={() => navigate({ to: "/assinar" })}
            >
              <Gem className="h-4 w-4" /> Assinar Diamante
            </Button>
          )}
        </div>
      </Card>

      {/* Segurança */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">Segurança da conta</p>
            <p className="text-sm text-muted-foreground">
              E-mail atual: <strong>{user?.email ?? "-"}</strong>
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Novo e-mail
            </Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="novo@email.com"
              className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
            />
          </div>
          <Button
            className="rounded-full self-end h-11"
            onClick={handleUpdateEmail}
            disabled={loadingEmail || !newEmail}
          >
            {loadingEmail ? "..." : "Alterar e-mail"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> Nova senha
            </Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
            />
          </div>
          <Button
            className="rounded-full self-end h-11"
            onClick={handleUpdatePassword}
            disabled={loadingPass || !newPassword}
          >
            {loadingPass ? "..." : "Alterar senha"}
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="rounded-full text-destructive gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
