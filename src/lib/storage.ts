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

/* ------------------ proteção contra perda de cadastros ----------------- *
 * Listas de cadastros (materiais, pedidos, orçamentos...) nunca são
 * substituídas por inteiro: os itens do aparelho e da nuvem são somados
 * pelo "id". Um item só some quando a pessoa realmente o exclui — a
 * exclusão fica anotada numa lista de "excluídos" que também sincroniza.
 * --------------------------------------------------------------------- */

export const TOMB_PREFIX = "lcp:tomb:";
/** Mesma lista usada pela proteção do servidor. */
export const MERGE_KEYS =
  /^lcp:(materiais|produtos|pedidos|orcamentos|clientes:extras|caixa:lancamentos|caixa:vendas|precItens|tabelasPrecos|formulas|fornecedores|fichasTecnicas|agendaProducao|datasClientes|contas|custos:maquinas|custos:ferramentas|custos:indiretos)$/;

type Item = { id: unknown } & Record<string, unknown>;

function isIdList(v: unknown): v is Item[] {
  return Array.isArray(v) && v.every((i) => i && typeof i === "object" && !Array.isArray(i) && "id" in i);
}

function safeParse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readTombs(key: string, uid: string | null = currentUid): Set<string> {
  const v = safeParse(localStorage.getItem(scopedKey(TOMB_PREFIX + key, uid)));
  return new Set(Array.isArray(v) ? v.map(String) : []);
}

function writeTombs(key: string, tombs: Set<string>, push = true) {
  const list = [...tombs].slice(-3000);
  const raw = JSON.stringify(list);
  localStorage.setItem(scopedKey(TOMB_PREFIX + key), raw);
  if (push) queuePush(TOMB_PREFIX + key, raw);
}

/** Soma duas listas pelo id; itens excluídos de verdade ficam de fora. */
export function mergeLists(primary: Item[], secondary: Item[], tombs: Set<string>): Item[] {
  const out: Item[] = [];
  const seen = new Set<string>();
  for (const item of [...primary, ...secondary]) {
    const id = String(item.id);
    if (seen.has(id) || tombs.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/** Anota quais itens a pessoa excluiu ao salvar uma lista. */
function recordDeletions(key: string, prevRaw: string | null, nextValue: unknown) {
  if (!MERGE_KEYS.test(key) || !currentUid) return;
  const prev = safeParse(prevRaw);
  if (!isIdList(prev) || !isIdList(nextValue)) return;
  const nextIds = new Set(nextValue.map((i) => String(i.id)));
  const tombs = readTombs(key);
  let changed = false;
  for (const item of prev) {
    const id = String(item.id);
    if (!nextIds.has(id) && !tombs.has(id)) {
      tombs.add(id);
      changed = true;
    }
  }
  for (const id of nextIds) {
    if (tombs.delete(id)) changed = true;
  }
  if (changed) writeTombs(key, tombs);
}

/* --------------------------- envio (push) --------------------------- */

const pending = new Map<string, string>(); // key -> valor JSON
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

async function flushPush() {
  pushTimer = null;
  const uid = currentUid;
  if (!uid || pending.size === 0) return;
  if (pushing) {
    schedulePush(500);
    return;
  }
  pushing = true;
  const snapshot = [...pending.entries()];
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.id !== uid) {
      schedulePush(2000);
      return;
    }

    // Lê o que já está na nuvem para somar, nunca apagar, os cadastros de outro aparelho.
    const mergeable = snapshot.map(([k]) => k).filter((k) => MERGE_KEYS.test(k));
    const remote = new Map<string, unknown>();
    if (mergeable.length > 0) {
      const { data, error } = await supabase
        .from("user_data")
        .select("key,value")
        .eq("user_id", uid)
        .in("key", [...mergeable, ...mergeable.map((k) => TOMB_PREFIX + k)]);
      if (error) throw error;
      for (const row of data ?? []) remote.set(row.key, row.value);
    }

    let localChanged = false;
    const finalRaw = new Map<string, string>();
    for (const [key, raw] of snapshot) {
      let value = safeParse(raw);
      if (key.startsWith(TOMB_PREFIX)) {
        const r = remote.get(key);
        if (Array.isArray(value) && Array.isArray(r)) {
          value = [...new Set([...r.map(String), ...value.map(String)])].slice(-3000);
        }
      } else if (MERGE_KEYS.test(key) && isIdList(value)) {
        const r = remote.get(key);
        const remoteTombs = remote.get(TOMB_PREFIX + key);
        const tombs = readTombs(key, uid);
        if (Array.isArray(remoteTombs)) remoteTombs.forEach((id) => tombs.add(String(id)));
        if (isIdList(r)) value = mergeLists(value, r, tombs);
      }
      const nextRaw = JSON.stringify(value);
      finalRaw.set(key, nextRaw);
      if (nextRaw !== raw && localStorage.getItem(scopedKey(key, uid)) === raw) {
        localStorage.setItem(scopedKey(key, uid), nextRaw);
        localChanged = true;
      }
    }

    // Excluídos sobem primeiro, para a nuvem saber o que pode sair.
    const toRow = (key: string) => ({
      user_id: uid,
      key,
      value: safeParse(finalRaw.get(key) ?? "null") as never,
    });
    const keys = snapshot.map(([k]) => k);
    const tombRows = keys.filter((k) => k.startsWith(TOMB_PREFIX)).map(toRow);
    const dataRows = keys.filter((k) => !k.startsWith(TOMB_PREFIX)).map(toRow);
    const meta = readMeta(uid);
    for (const rows of [tombRows, dataRows]) {
      if (rows.length === 0) continue;
      const { data, error } = await supabase
        .from("user_data")
        .upsert(rows, { onConflict: "user_id,key" })
        .select("key,updated_at");
      if (error) throw error;
      for (const row of data ?? []) meta[row.key] = row.updated_at;
    }
    writeMeta(meta, uid);
    for (const [key, raw] of snapshot) {
      if (pending.get(key) === raw) pending.delete(key);
    }
    persistPending(uid);
    if (localChanged) notify();
  } catch (e) {
    console.warn("sync push falhou", e);
    persistPending(uid);
    schedulePush(3000);
  } finally {
    pushing = false;
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
    const tombRemote = new Map<string, unknown>();
    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      if (row.key.startsWith(TOMB_PREFIX)) tombRemote.set(row.key, row.value);
    }

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

      // Listas de cadastros: soma aparelho + nuvem, nunca descarta itens.
      if (MERGE_KEYS.test(row.key) && isIdList(row.value)) {
        const localValue = safeParse(localRaw);
        if (localRaw !== null && localRaw !== remoteRaw && isIdList(localValue)) {
          const localNewer = !!localAt && new Date(localAt) > new Date(remoteAt);
          const tombs = readTombs(row.key, uid);
          const remoteTombs = tombRemote.get(TOMB_PREFIX + row.key);
          if (Array.isArray(remoteTombs)) remoteTombs.forEach((id) => tombs.add(String(id)));
          const merged = localNewer
            ? mergeLists(localValue, row.value, tombs)
            : mergeLists(row.value, localValue, tombs);
          const mergedRaw = JSON.stringify(merged);
          if (mergedRaw !== localRaw) {
            localStorage.setItem(full, mergedRaw);
            changed = true;
          }
          if (mergedRaw !== remoteRaw) pending.set(row.key, mergedRaw);
          meta[row.key] = localNewer ? localAt : remoteAt;
          continue;
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
    const full = scopedKey(key);
    recordDeletions(key, localStorage.getItem(full), value);
    localStorage.setItem(full, raw);
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
