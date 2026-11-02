import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Download, Share, Smartphone, X } from "lucide-react";
import {
  canPromptInstall,
  isIOS,
  isIOSSafari,
  isStandalone,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa";
import { toast } from "sonner";

const DISMISS_KEY = "lcp:installAviso";
const COOKIE_KEY = "lcp:avisoCookies";
export const INSTALL_DIALOG_EVENT = "lcp:abrir-instalacao";

export function openInstallDialog(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INSTALL_DIALOG_EVENT));
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

type Plataform = "ios" | "ios-outro" | "android" | "nada";

function detectPlatform(): Plataform {
  if (isStandalone()) return "nada";
  if (isIOS()) return isIOSSafari() ? "ios" : "ios-outro";
  if (canPromptInstall()) return "android";
  return "nada";
}

function IOSSteps() {
  return (
    <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
      <li className="flex items-start gap-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-foreground">
          1
        </span>
        <span>
          Na barra de baixo do Safari, toque em{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Compartilhar <Share className="h-3.5 w-3.5" />
          </span>
          .
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-foreground">
          2
        </span>
        <span>
          Role a lista e toque em{" "}
          <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-foreground">
          3
        </span>
        <span>
          Confirme em <span className="font-medium text-foreground">Adicionar</span>. O ícone do
          diamante aparece na tela inicial.
        </span>
      </li>
    </ol>
  );
}

/** Aviso fixo no rodapé, uma única vez, com o passo a passo do iPhone ou o botão do Android. */
export function InstallAppNotice() {
  const [platform, setPlatform] = useState<Plataform>("nada");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const p = detectPlatform();
      setPlatform(p);
      if (p === "nada") {
        setShow(false);
        return;
      }
      if (readFlag(DISMISS_KEY)) return;
      // deixa o aviso de cookies sair da frente primeiro
      if (!readFlag(COOKIE_KEY)) return;
      setShow(true);
    };
    refresh();
    const unsub = subscribeInstallState(refresh);
    const onCookies = () => refresh();
    window.addEventListener("lcp:cookies-aceito", onCookies);
    return () => {
      unsub();
      window.removeEventListener("lcp:cookies-aceito", onCookies);
    };
  }, []);

  function dismiss() {
    writeFlag(DISMISS_KEY);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Instalar o aplicativo"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-card-foreground shadow-lg"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15">
        <Smartphone className="h-4 w-4 text-foreground" />
      </div>
      <div className="flex-1">
        <p className="font-medium">
          {platform === "android"
            ? "Instale o Lucrando no seu celular"
            : "Instale o Lucrando no seu iPhone"}
        </p>
        {platform === "android" && (
          <p className="mt-1 text-muted-foreground">
            Fica com ícone próprio e abre como um app, sem a barra do navegador.
          </p>
        )}
        {platform === "ios" && <IOSSteps />}
        {platform === "ios-outro" && (
          <p className="mt-1 text-muted-foreground">
            No iPhone, a instalação só funciona pelo <span className="font-medium text-foreground">Safari</span>.
            Abra este endereço no Safari e toque em{" "}
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              Compartilhar <Share className="h-3.5 w-3.5" />
            </span>{" "}
            &gt; <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {platform === "android" && (
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              onClick={async () => {
                const ok = await promptInstall();
                if (ok) {
                  writeFlag(DISMISS_KEY);
                  setShow(false);
                }
              }}
            >
              <Download className="h-4 w-4" /> Instalar app
            </Button>
          )}
          <Button size="sm" variant="ghost" className="rounded-full" onClick={dismiss}>
            Entendi
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso de instalação"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Janela com as instruções completas, aberta pelo menu lateral. */
export function InstallAppDialog() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Plataform>("nada");

  useEffect(() => {
    const onOpen = () => {
      setPlatform(detectPlatform());
      setOpen(true);
    };
    window.addEventListener(INSTALL_DIALOG_EVENT, onOpen);
    return () => window.removeEventListener(INSTALL_DIALOG_EVENT, onOpen);
  }, []);

  const installed = isStandalone();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Instalar o app
          </DialogTitle>
          <DialogDescription>
            {installed
              ? "Você já está usando o app instalado. Nada mais precisa ser feito."
              : "O app abre em tela cheia, com ícone próprio, e continua sincronizando com a nuvem."}
          </DialogDescription>
        </DialogHeader>

        {!installed && (
          <div className="space-y-4">
            {platform === "ios" && (
              <div>
                <p className="text-sm font-medium">No iPhone (Safari)</p>
                <IOSSteps />
              </div>
            )}
            {platform === "ios-outro" && (
              <p className="text-sm text-muted-foreground">
                Abra este endereço no <span className="font-medium text-foreground">Safari</span> e
                toque em{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  Compartilhar <Share className="h-3.5 w-3.5" />
                </span>{" "}
                &gt;{" "}
                <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
                Outros navegadores do iPhone não oferecem essa opção.
              </p>
            )}
            {platform === "android" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Toque no botão abaixo e confirme a instalação.
                </p>
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={async () => {
                    const ok = await promptInstall();
                    if (ok) setOpen(false);
                  }}
                >
                  <Download className="h-4 w-4" /> Instalar app
                </Button>
              </div>
            )}
            {platform === "nada" && (
              <p className="text-sm text-muted-foreground">
                Este navegador não oferece instalação automática. No iPhone, use o Safari e escolha{" "}
                <span className="font-medium text-foreground">Adicionar à Tela de Início</span>. No
                Android, abra o menu do Chrome e escolha{" "}
                <span className="font-medium text-foreground">Instalar app</span>.
              </p>
            )}
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <Check className="mr-1 inline h-3.5 w-3.5" />
              Depois de instalar, entre na sua conta: seus materiais, pedidos e orçamentos voltam
              automaticamente da nuvem.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Botão usado no menu lateral. */
export function InstallMenuItem({ onPick }: { onPick: () => void }) {
  return (
    <Button variant="ghost" className="w-full justify-start rounded-full" onClick={onPick}>
      <Download className="mr-2 h-4 w-4" /> Instalar o App
    </Button>
  );
}

export { toast };
