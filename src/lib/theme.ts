import { useCallback, useEffect, useState } from "react";

const KEY = "lcp:temaEscuro";
const EVENT = "lcp:tema-mudou";

export function isDarkStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function applyDark(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

/** Hook de tema escuro — sincroniza localStorage, classe no <html> e outras abas/telas. */
export function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = isDarkStored();
    setDark(stored);
    applyDark(stored);
    const onChange = () => {
      const v = isDarkStored();
      setDark(v);
      applyDark(v);
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyDark(value);
    setDark(value);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { dark, setDark: toggle };
}
