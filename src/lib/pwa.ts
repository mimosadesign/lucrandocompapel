/* Helpers do app instalável (PWA): detecção de plataforma, estado de instalação
   e registro seguro do service worker. */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PREVIEW_SUFFIXES = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];
const BLOCKED_EXACT = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
const BLOCKED_SUFFIXES = [".lovableproject.com", ".lovableproject-dev.com", ".beta.lovable.dev"];

function host(): string {
  return window.location.hostname.toLowerCase();
}

/** true quando estamos no editor/preview do Lovable (onde o worker nunca deve registrar). */
export function isPreviewContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const hostname = host();
  const firstLabel = hostname.split(".")[0] ?? "";
  if (PREVIEW_SUFFIXES.some((s) => hostname.endsWith(s)) && PREVIEW_LABEL.test(firstLabel)) return true;
  if (BLOCKED_EXACT.includes(hostname)) return true;
  if (BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (!import.meta.env.PROD) return false;
  return !isPreviewContext();
}

function targetsOurWorker(reg: ServiceWorkerRegistration): boolean {
  const urls = [reg.active, reg.installing, reg.waiting]
    .filter(Boolean)
    .map((w) => (w as ServiceWorker).scriptURL);
  return urls.some((u) => u.endsWith("/sw.js"));
}

async function unregisterOurWorker(): Promise<void> {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter(targetsOurWorker).map((r) => r.unregister()));
}

export async function registerAppServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!shouldRegisterServiceWorker()) {
    await unregisterOurWorker().catch(() => {});
    return;
  }
  const go = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sem worker: o app continua funcionando, só não fica offline */
    });
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/** O app está aberto como app instalado (tela inicial), não como aba do navegador. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  if (mq("(display-mode: standalone)") || mq("(display-mode: minimal-ui)")) return true;
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iP(hone|ad|od)/.test(ua)) return true;
  // iPadOS 13+ se apresenta como Mac, mas com tela sensível ao toque.
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
}

/** Safari do iPhone/iPad — só ele oferece "Adicionar à Tela de Início". */
export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent || "";
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|MRiOS|MiuiBrowser|UCBrowser|GSA|Instagram|FBAN|FBAV/i.test(ua);
}

/** Navegador do iPhone que não permite instalar (Chrome, Firefox etc.). */
export function isIOSOtherBrowser(): boolean {
  return isIOS() && !isIOSSafari();
}

/* ---------- botão "Instalar" dos navegadores que suportam (Android/Chrome) ---------- */

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function emit(): void {
  subscribers.forEach((fn) => fn());
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

export function subscribeInstallState(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  await event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  deferredPrompt = null;
  emit();
  return choice.outcome === "accepted";
}
