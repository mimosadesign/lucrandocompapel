import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ *
 * Escopo por usuário + sincronização na nuvem
 *
 * Todos os dados locais (materiais, produtos, pedidos, orçamentos...)
 * ficam guardados em uma "gaveta" exclusiva do usuário logado, para que
 * nenhuma informação de uma conta apareça em outra no mesmo aparelho.
 *
 * Além disso, cada chave é espelhada na tabela `user_data` do backend,
 * assim os mesmos dados aparecem no celular, tablet e computador.
 * ------------------------------------------------------------------ */

const UID_KEY = "lcp:uid";
const MIGRATED_KEY = "lcp:migrated";
const META_KEY = "lcp:meta:updated";

let currentUid: string | null = null;
const listeners = new Set<() => void>();
/** Muda a cada sincronização para os componentes relerem o localStorage. */
let revision = 0;

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

function notify() {
  revision++;
  listeners.forEach((fn) => fn());
}

/* ----------------------------- metadados ---------------------------- */

function metaFullKey(uid: string | null = currentUid) {
  return scopedKey(META_KEY, uid);
}

function readMeta(uid: string | null = currentUid): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(metaFullKey(uid));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, string>, uid: string | null = currentUid) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(metaFullKey(uid), JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

function touchMeta(key: string, when = new Date().toISOString()) {
  const meta = readMeta();
  meta[key] = when;
  writeMeta(meta);
}

/** Chaves que não devem ir para a nuvem (controle local do aparelho). */
function isSyncable(key: string) {
  return (
    key.startsWith("lcp:") &&
    key !== UID_KEY &&
    key !== MIGRATED_KEY &&
    key !== META_KEY
  );
}

/* --------------------------- envio (push) --------------------------- */

const pending = new Map<string, string>(); // key -> valor JSON
let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPush() {
  pushTimer = null;
  const uid = currentUid;
  if (!uid || pending.size === 0) return;
  const rows = [...pending.entries()].map(([key, raw]) => {
    let value: unknown = null;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    return {
      user_id: uid,
      key,
      value: value as never,
      updated_at: new Date().toISOString(),
    };
  });
  pending.clear();
  try {
    const { error } = await supabase
      .from("user_data")
      .upsert(rows, { onConflict: "user_id,key" });
    if (error) console.warn("sync push falhou", error.message);
  } catch (e) {
    console.warn("sync push falhou", e);
  }
}

function queuePush(key: string, rawValue: string) {
  if (!currentUid || !isSyncable(key)) return;
  pending.set(key, rawValue);
  touchMeta(key);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushPush(), 700);
}

/* ---------------------------- baixa (pull) -------------------------- */

let syncing = false;
let syncedOnce = false;

export function isSynced() {
  return syncedOnce;
}

/** Baixa os dados da nuvem e resolve conflitos pelo horário mais recente. */
export async function syncFromCloud() {
  const uid = currentUid;
  if (!uid || typeof window === "undefined" || syncing) return;
  syncing = true;
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("key,value,updated_at")
      .eq("user_id", uid);
    if (error) throw error;

    const meta = readMeta(uid);
    const remoteKeys = new Set<string>();
    let changed = false;

    for (const row of (data ?? []) as {
      key: string;
      value: unknown;
      updated_at: string;
    }[]) {
      remoteKeys.add(row.key);
      const localAt = meta[row.key];
      const remoteAt = row.updated_at;
      const full = scopedKey(row.key, uid);
      const localRaw = localStorage.getItem(full);
      const remoteRaw = JSON.stringify(row.value);

      if (localRaw !== null && localAt && new Date(localAt) > new Date(remoteAt)) {
        // Local é mais novo → sobe para a nuvem.
        if (localRaw !== remoteRaw) pending.set(row.key, localRaw);
        continue;
      }
      if (localRaw !== remoteRaw) {
        try {
          localStorage.setItem(full, remoteRaw);
          changed = true;
        } catch {
          /* ignore */
        }
      }
      meta[row.key] = remoteAt;
    }

    // Chaves que só existem neste aparelho → sobem para a nuvem.
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (!full || !full.startsWith(`u:${uid}:`)) continue;
      const key = full.slice(`u:${uid}:`.length);
      if (!isSyncable(key) || remoteKeys.has(key)) continue;
      const raw = localStorage.getItem(full);
      if (raw === null) continue;
      pending.set(key, raw);
      meta[key] = meta[key] ?? new Date().toISOString();
    }

    writeMeta(meta, uid);
    if (pending.size > 0) await flushPush();
    syncedOnce = true;
    if (changed) notify();
  } catch (e) {
    console.warn("sync pull falhou", e);
    syncedOnce = true;
  } finally {
    syncing = false;
  }
}

if (typeof window !== "undefined") {
  // Ao voltar para o app (troca de aba/aparelho), busca as atualizações.
  window.addEventListener("focus", () => void syncFromCloud());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncFromCloud();
  });
  window.addEventListener("beforeunload", () => {
    if (pending.size > 0) void flushPush();
  });
}

/* --------------------------- usuário atual -------------------------- */

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
  syncedOnce = false;
  pending.clear();
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
  notify();
  if (uid) void syncFromCloud();
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
    const raw = JSON.stringify(value);
    localStorage.setItem(scopedKey(key), raw);
    queuePush(key, raw);
  } catch {
    /* ignore */
  }
}

export function useLocalState<T>(key: string, initial: T) {
  const uid = useStorageUser();
  const full = scopedKey(key, uid);
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [rev, setRev] = useState(revision);

  // Recarrega quando a sincronização com a nuvem trouxer dados novos.
  useEffect(() => {
    const fn = () => setRev(revision);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

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
  }, [full, rev]);

  useEffect(() => {
    if (loadedKey !== full) return;
    try {
      const raw = JSON.stringify(value);
      if (localStorage.getItem(full) === raw) return;
      localStorage.setItem(full, raw);
      queuePush(key, raw);
    } catch {
      /* ignore */
    }
  }, [full, key, value, loadedKey]);

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
