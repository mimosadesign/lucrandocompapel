import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * Escopo por usuário
 * Todos os dados locais (materiais, produtos, pedidos, orçamentos...)
 * ficam guardados em uma "gaveta" exclusiva do usuário logado, para que
 * nenhuma informação de uma conta apareça em outra no mesmo aparelho.
 * ------------------------------------------------------------------ */

const UID_KEY = "lcp:uid";
const MIGRATED_KEY = "lcp:migrated";

let currentUid: string | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    currentUid = localStorage.getItem(UID_KEY);
  } catch {
    currentUid = null;
  }
}

export function getStorageUser() {
  return currentUid;
}

export function scopedKey(key: string, uid: string | null = currentUid) {
  if (key.startsWith("lcp:uid") || key.startsWith("lcp:migrated")) return key;
  return uid ? `u:${uid}:${key}` : `anon:${key}`;
}

/** Copia os dados antigos (sem dono) para a primeira conta que entrar no aparelho. */
function migrateLegacyData(uid: string) {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    localStorage.setItem(MIGRATED_KEY, uid);
    const legacy: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("lcp:") && k !== UID_KEY && k !== MIGRATED_KEY) legacy.push(k);
    }
    for (const k of legacy) {
      const value = localStorage.getItem(k);
      if (value === null) continue;
      const dest = `u:${uid}:${k}`;
      if (localStorage.getItem(dest) === null) localStorage.setItem(dest, value);
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

export function setStorageUser(uid: string | null) {
  if (uid === currentUid) return;
  currentUid = uid;
  try {
    if (uid) {
      localStorage.setItem(UID_KEY, uid);
      migrateLegacyData(uid);
    } else {
      localStorage.removeItem(UID_KEY);
    }
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function useStorageUser() {
  const [uid, setUid] = useState<string | null>(currentUid);
  useEffect(() => {
    const fn = () => setUid(getStorageUser());
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return uid;
}

/** Leitura direta (fora de componentes), já respeitando o usuário atual. */
export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(scopedKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function useLocalState<T>(key: string, initial: T) {
  const uid = useStorageUser();
  const full = scopedKey(key, uid);
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let next = initial;
    try {
      const raw = localStorage.getItem(full);
      if (raw) next = JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    setValue(next);
    setLoadedKey(full);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  useEffect(() => {
    if (loadedKey !== full) return;
    try {
      localStorage.setItem(full, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [full, value, loadedKey]);

  return [value, setValue] as const;
}

export function brl(value: number) {
  if (!isFinite(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseNum(v: string) {
  return parseFloat(v.replace(",", ".")) || 0;
}

/** Chave do mês atual, usada nos limites que zeram todo dia 1º. */
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
