import { useEffect, useState } from "react";

export type LocalUser = {
  nome: string;
  email: string;
  provider: "google" | "email";
  trialStart: string; // ISO date
};

const USER_KEY = "lcp:user";
const TRIAL_DAYS = 25;

export function getUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function setUser(u: LocalUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("lcp:user-changed"));
}

export function trialDaysLeft(u: LocalUser | null): number {
  if (!u) return 0;
  const start = new Date(u.trialStart).getTime();
  if (!isFinite(start)) return 0;
  const elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function isTrialActive(u: LocalUser | null): boolean {
  return trialDaysLeft(u) > 0;
}

/**
 * Limites do plano gratuito são removidos apenas quando o usuário
 * está logado E com período de teste ativo (25 dias).
 */
export function isUnlimited(): boolean {
  return isTrialActive(getUser());
}

export function useUser() {
  const [user, setU] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setU(getUser());
    setReady(true);
    const onChange = () => setU(getUser());
    window.addEventListener("lcp:user-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lcp:user-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return { user, ready };
}

export function useIsUnlimited() {
  const { user } = useUser();
  return isTrialActive(user);
}

export function openDiamondDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lcp:open-diamond"));
}
