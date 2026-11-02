import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "lcp:avisoCookies";

export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setShow(true);
    } catch {
      /* ignore */
    }
  }, []);
  if (!show) return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-card-foreground shadow-lg sm:flex-row sm:items-center">
      <p className="flex-1">
        Usamos só o armazenamento essencial para manter seu login e seus dados. Nada de rastreamento.{" "}
        <Link to="/legal/cookies" className="underline">Saiba mais</Link>
      </p>
      <Button
        size="sm"
        className="rounded-full"
        onClick={() => {
          try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
          setShow(false);
          window.dispatchEvent(new Event("lcp:cookies-aceito"));
        }}
      >
        Entendi
      </Button>
    </div>
  );
}
