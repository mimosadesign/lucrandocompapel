import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalState, brl } from "@/lib/storage";
import type { Produto } from "./produtos";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo digital — Lucrando com Papel" }] }),
  component: CatalogoPage,
});

// Base64URL encoding (safe for URLs)
function toBase64Url(str: string) {
  const b64 = typeof window === "undefined"
    ? Buffer.from(str, "utf-8").toString("base64")
    : btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function CatalogoPage() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [whats, setWhats] = useLocalState<string>("lcp:whats", "");
  const [nomeAtelier, setNomeAtelier] = useLocalState<string>("lcp:nomeAtelier", "");
  const [copied, setCopied] = useState(false);

  const itens = useMemo(
    () =>
      produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: p.custo * (1 + p.margemPct / 100),
      })),
    [produtos],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || itens.length === 0) return "";
    const payload = {
      n: nomeAtelier || "Ateliê",
      w: whats.replace(/\D/g, ""),
      p: itens.map((i) => ({ n: i.nome, v: Number(i.preco.toFixed(2)) })),
    };
    const encoded = toBase64Url(JSON.stringify(payload));
    return `${window.location.origin}/c/${encoded}`;
  }, [itens, whats, nomeAtelier]);

  async function copiar() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Catálogo digital"
        description="Sua vitrine online — compartilhe um link com seus clientes. Eles escolhem os produtos e enviam o pedido direto pelo seu WhatsApp."
      />

      <Card className="mb-6 rounded-3xl border-primary/30 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          <h2 className="font-display text-base font-semibold">Link do seu catálogo</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe este link com seus clientes. Ele abre apenas o catálogo e o carrinho — sem acesso ao seu app.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Nome do ateliê (aparece no link)
            </Label>
            <Input
              value={nomeAtelier}
              onChange={(e) => setNomeAtelier(e.target.value)}
              placeholder="Ex: Ateliê da Bia"
              className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Seu WhatsApp (DDI+DDD+nº)
            </Label>
            <Input
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              placeholder="5511999999999"
              className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
            />
          </div>
        </div>
        {itens.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
            Cadastre produtos em{" "}
            <Link to="/produtos" className="underline font-medium">
              Produtos
            </Link>{" "}
            para gerar o link.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm">
              <span className="flex-1 truncate text-muted-foreground">{shareUrl}</span>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full gap-1 shrink-0"
                onClick={copiar}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full gap-1 border-foreground/20"
              >
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir catálogo público
                </a>
              </Button>
              {whats && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-full gap-1 bg-success text-primary-foreground hover:bg-success/90"
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Confira meu catálogo:\n${shareUrl}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Compartilhar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <h2 className="mb-4 font-display text-lg font-semibold">Prévia dos produtos</h2>
      {itens.length === 0 ? (
        <Card className="rounded-3xl border-border/60 p-10 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          <Gift className="mx-auto mb-3 h-8 w-8 opacity-60" />
          <p className="font-medium">Seu catálogo está vazio.</p>
          <p className="text-sm">
            Cadastre produtos em{" "}
            <Link to="/produtos" className="underline">
              Produtos
            </Link>{" "}
            e eles aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden rounded-3xl border-border/60 shadow-[var(--shadow-card)]"
            >
              <div className="aspect-square bg-gradient-to-br from-accent/40 to-secondary grid place-items-center">
                <Gift className="h-14 w-14 text-muted-foreground/60" />
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-semibold">{p.nome}</h3>
                <p className="mt-2 font-display text-lg font-semibold">{brl(p.preco)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
