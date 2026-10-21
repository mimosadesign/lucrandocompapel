import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const LEGAL_ATUALIZADO = "21 de outubro de 2026";
export const CONTATO_WHATSAPP = "(11) 95920-3386";

export function LegalPage({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-3xl bg-card p-6 shadow-sm sm:p-10">
        <Link to="/auth" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: {LEGAL_ATUALIZADO}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <nav aria-label="Documentos legais" className="mt-10 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
          <Link to="/legal/privacidade" className="underline-offset-4 hover:underline">Privacidade</Link>
          <Link to="/legal/termos" className="underline-offset-4 hover:underline">Termos de uso</Link>
          <Link to="/legal/reembolso" className="underline-offset-4 hover:underline">Reembolso</Link>
          <Link to="/legal/cookies" className="underline-offset-4 hover:underline">Cookies</Link>
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Lucrando com Papel. Todos os direitos reservados.</p>
      </article>
    </div>
  );
}

function meta(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
export const legalHead = meta;
