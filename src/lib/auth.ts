import { useEffect, useState } from "react";

export type LocalUser = {
  nome: string;
  email: string;
  provider: "google" | "email";
  trialStart: string; // ISO date
};

const USER_KEY = "lcp:user";
const DIAMOND_KEY = "lcp:diamondPreview";
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

export function isDiamondPreview(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DIAMOND_KEY) === "1";
}

export function setDiamondPreview(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(DIAMOND_KEY, "1");
  else localStorage.removeItem(DIAMOND_KEY);
  window.dispatchEvent(new Event("lcp:diamond-changed"));
}

export function useDiamondPreview() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isDiamondPreview());
    const fn = () => setOn(isDiamondPreview());
    window.addEventListener("lcp:diamond-changed", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("lcp:diamond-changed", fn);
      window.removeEventListener("storage", fn);
    };
  }, []);
  return [on, (v: boolean) => setDiamondPreview(v)] as const;
}

export function openDiamondDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lcp:open-diamond"));
}
