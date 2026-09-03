import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
const DIRTY_KEY = "lcp:sync:pending";
const RESCUE_KEY = "lcp:sync:v2";

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

function dirtyFullKey(uid: string) {
  return `u:${uid}:${DIRTY_KEY}`;
}

function restorePending(uid: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(dirtyFullKey(uid));
    const saved = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    Object.entries(saved).forEach(([key, value]) => pending.set(key, value));
  } catch {
    /* ignore */
  }
}

function persistPending(uid: string | null = currentUid) {
  if (!uid || typeof window === "undefined") return;
  try {
    localStorage.setItem(dirtyFullKey(uid), JSON.stringify(Object.fromEntries(pending)));
  } catch {
    /* ignore */
  }
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
    key !== META_KEY &&
    key !== DIRTY_KEY &&
    key !== RESCUE_KEY
  );
}

/* --------------------------- envio (push) --------------------------- */

const pending = new Map<string, string>(); // key -> valor JSON
let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPush() {
  pushTimer = null;
  const uid = currentUid;
  if (!uid || pending.size === 0) return;
  const snapshot = [...pending.entries()];
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id !== uid) {
    schedulePush(2000);
    return;
  }
  const rows = snapshot.map(([key, raw]) => {
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
    };
  });
  try {
    const { data, error } = await supabase
      .from("user_data")
      .upsert(rows, { onConflict: "user_id,key" })
      .select("key,updated_at");
    if (error) throw error;
    const meta = readMeta(uid);
    for (const row of data ?? []) meta[row.key] = row.updated_at;
    writeMeta(meta, uid);
    for (const [key, raw] of snapshot) {
      if (pending.get(key) === raw) pending.delete(key);
    }
    persistPending(uid);
  } catch (e) {
    console.warn("sync push falhou", e);
    persistPending(uid);
    schedulePush(3000);
  }
}

function schedulePush(delay = 700) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushPush(), delay);
}

function queuePush(key: string, rawValue: string) {
  if (!currentUid || !isSyncable(key)) return;
  pending.set(key, rawValue);
  touchMeta(key);
  persistPending();
  schedulePush();
}

/* ---------------------------- baixa (pull) -------------------------- */

let syncing = false;
let syncedOnce = false;
let syncAgain = false;
let realtimeCleanup: (() => void) | null = null;

export function isSynced() {
  return syncedOnce;
}

/** Baixa os dados da nuvem e resolve conflitos pelo horário mais recente. */
export async function syncFromCloud() {
  const uid = currentUid;
  if (!uid || typeof window === "undefined") return;
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  try {
    if (pending.size > 0) await flushPush();
    const { data, error } = await supabase
      .from("user_data")
      .select("key,value,updated_at")
      .eq("user_id", uid);
    if (error) throw error;

    const meta = readMeta(uid);
    const remoteKeys = new Set<string>();
    let changed = false;
    const rescueKey = `u:${uid}:${RESCUE_KEY}`;
    const needsRescue = localStorage.getItem(rescueKey) !== "1";

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

      // Resgata cadastros feitos por versões antigas que gravavam apenas no aparelho.
      if (needsRescue && localRaw !== null && !localAt && localRaw !== remoteRaw) {
        try {
          const localValue = JSON.parse(localRaw) as unknown;
          if (Array.isArray(localValue) && Array.isArray(row.value)) {
            const byId = new Map<string, unknown>();
            for (const item of row.value) {
              if (item && typeof item === "object" && "id" in item) byId.set(String(item.id), item);
            }
            for (const item of localValue) {
              if (item && typeof item === "object" && "id" in item) byId.set(String(item.id), item);
            }
            const merged = JSON.stringify([...byId.values()]);
            localStorage.setItem(full, merged);
            pending.set(row.key, merged);
            meta[row.key] = new Date().toISOString();
            changed = true;
            continue;
          }
        } catch {
          /* use remote value below */
        }
      }

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
    localStorage.setItem(rescueKey, "1");
    if (pending.size > 0) await flushPush();
    syncedOnce = true;
    if (changed) notify();
  } catch (e) {
    console.warn("sync pull falhou", e);
    syncedOnce = true;
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      void syncFromCloud();
    }
  }
}

function subscribeToCloud(uid: string) {
  realtimeCleanup?.();
  const channel = supabase
    .channel(`user-data-${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${uid}` },
      () => void syncFromCloud(),
    )
    .subscribe();
  realtimeCleanup = () => {
    void supabase.removeChannel(channel);
  };
}

if (typeof window !== "undefined") {
  // Ao voltar para o app (troca de aba/aparelho), busca as atualizações.
  window.addEventListener("focus", () => void syncFromCloud());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncFromCloud();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") void syncFromCloud();
  }, 15000);
  window.addEventListener("beforeunload", () => {
    if (pending.size > 0) void flushPush();
  });
}

/* --------------------------- usuário atual -------------------------- */

/** Copia os dados antigos (sem dono) para a primeira conta que entrar no aparelho. */
function migrateLegacyData(uid: string) {
  if (typeof window === "undefined") return;
  try {
    const migratedForUser = `${MIGRATED_KEY}:${uid}`;
    if (localStorage.getItem(migratedForUser)) return;
    localStorage.setItem(migratedForUser, "1");
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
  if (uid === currentUid) {
    if (uid) {
      restorePending(uid);
      subscribeToCloud(uid);
      void syncFromCloud();
    }
    return;
  }
  realtimeCleanup?.();
  realtimeCleanup = null;
  currentUid = uid;
  syncedOnce = false;
  pending.clear();
  try {
    if (uid) {
      localStorage.setItem(UID_KEY, uid);
      migrateLegacyData(uid);
      restorePending(uid);
    } else {
      localStorage.removeItem(UID_KEY);
    }
  } catch {
    /* ignore */
  }
  notify();
  if (uid) {
    subscribeToCloud(uid);
    void syncFromCloud();
  }
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
    notify();
  } catch {
    /* ignore */
  }
}

export function useLocalState<T>(key: string, initial: T) {
  const uid = useStorageUser();
  const full = scopedKey(key, uid);
  const [value, setValue] = useState<T>(initial);
  const [rev, setRev] = useState(revision);
  const valueRef = useRef(value);
  valueRef.current = value;

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
    valueRef.current = next;
    setValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, rev]);

  const setSyncedValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      const resolved = typeof next === "function"
        ? (next as (previous: T) => T)(valueRef.current)
        : next;
      valueRef.current = resolved;
      setValue(resolved);
      writeLocal(key, resolved);
    },
    [key, full],
  );

  return [value, setSyncedValue] as const;
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
