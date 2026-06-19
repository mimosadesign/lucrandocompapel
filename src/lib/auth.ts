import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import { getStripeEnvironment } from "@/lib/stripe";

const TRIAL_DAYS = 25;

export type Profile = {
  id: string;
  nome: string | null;
  nome_atelier: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  tema_cor: string | null;
  trial_start: string;
};

export type AppUser = {
  id: string;
  email: string;
  nome: string;
  trialStart: string;
  profile: Profile | null;
};

export type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  price_id: string | null;
};

function toAppUser(authUser: AuthUser | null, profile: Profile | null): AppUser | null {
  if (!authUser) return null;
  const trialStart = profile?.trial_start ?? authUser.created_at ?? new Date().toISOString();
  const nome =
    profile?.nome ||
    (authUser.user_metadata as { nome?: string; full_name?: string })?.nome ||
    (authUser.user_metadata as { full_name?: string })?.full_name ||
    authUser.email?.split("@")[0] ||
    "Você";
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    nome,
    trialStart,
    profile,
  };
}

export function trialDaysLeft(u: { trialStart?: string } | null | undefined): number {
  if (!u?.trialStart) return 0;
  const start = new Date(u.trialStart).getTime();
  if (!isFinite(start)) return 0;
  const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function isTrialActive(u: { trialStart?: string } | null | undefined): boolean {
  return trialDaysLeft(u) > 0;
}

function isSubActive(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const now = Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status)) {
    return end === null || end > now;
  }
  if (sub.status === "canceled" && end && end > now) return true;
  return false;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

async function fetchSubscription(userId: string): Promise<SubscriptionRow | null> {
  let env: "sandbox" | "live" = "sandbox";
  try {
    env = getStripeEnvironment();
  } catch {
    env = "sandbox";
  }
  const { data } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,cancel_at_period_end,price_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

/**
 * Hook principal — devolve o usuário logado + perfil. `ready` indica que a
 * sessão já foi resolvida (evita flash de tela de login para quem está logado).
 */
export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(async (authUser: AuthUser | null) => {
    if (!authUser) {
      setUser(null);
      setReady(true);
      return;
    }
    // Set user immediately from session so route gates don't bounce to /auth
    // while we wait for the profile fetch (which can be slow or fail under RLS).
    setUser(toAppUser(authUser, null));
    setReady(true);
    try {
      const profile = await fetchProfile(authUser.id);
      setUser((prev) =>
        prev && prev.id === authUser.id ? toAppUser(authUser, profile) : prev,
      );
    } catch (e) {
      console.error("fetchProfile failed", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await hydrate(data.user ?? null);
  }, [hydrate]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      await hydrate(data.session?.user ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setReady(true);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        void hydrate(session?.user ?? null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready, refresh };
}

/**
 * Hook de entitlement: combina trial + assinatura ativa.
 */
export function useEntitlement() {
  const { user, ready } = useUser();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [subReady, setSubReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setSub(null);
      setSubReady(true);
      return;
    }
    let active = true;
    void (async () => {
      const s = await fetchSubscription(user.id);
      if (!active) return;
      setSub(s);
      setSubReady(true);
    })();
    // realtime: refresh on any change to user's subscription
    const channel = supabase
      .channel(`sub-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          void (async () => {
            const s = await fetchSubscription(user.id);
            if (active) setSub(s);
          })();
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const inTrial = isTrialActive(user);
  const daysLeft = trialDaysLeft(user);
  const isPaid = isSubActive(sub);
  const isUnlimited = inTrial || isPaid;

  return {
    user,
    sub,
    inTrial,
    daysLeft,
    isPaid,
    isUnlimited,
    ready: ready && subReady,
  };
}

export function useIsUnlimited() {
  return useEntitlement().isUnlimited;
}

export function openDiamondDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lcp:open-diamond"));
}

export async function signOutEverywhere() {
  await supabase.auth.signOut();
}
