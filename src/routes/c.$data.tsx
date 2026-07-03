import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Plus, Minus, MessageCircle, Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SharedItem = { n: string; v: number };
type SharedCatalog = { n: string; w: string; p: SharedItem[] };

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    s.length + ((4 - (s.length % 4)) % 4),
    "=",
  );
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(atob(b64)));
}

function brl(value: number) {
  if (!isFinite(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const Route = createFileRoute("/c/$data")({
  head: ({ params }) => {
    let title = "Catálogo";
    try {
      const decoded = JSON.parse(fromBase64Url(params.data)) as SharedCatalog;
      title = `${decoded.n} — Catálogo`;
    } catch {
      /* ignore */
    }
    return {
      meta: [
        { title },
        { name: "description", content: "Catálogo de produtos artesanais." },
      ],
    };
  },
  component: PublicCatalog,
});

function PublicCatalog() {
  const { data } = Route.useParams();
  const catalog = useMemo<SharedCatalog | null>(() => {
    try {
      return JSON.parse(fromBase64Url(data)) as SharedCatalog;
    } catch {
      return null;
    }
  }, [data]);

  const [cart, setCart] = useState<Record<number, number>>({});
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");

  if (!catalog) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="font-display text-xl font-semibold">Link inválido</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O catálogo compartilhado não pôde ser lido.
          </p>
        </div>
      </div>
    );
  }

  function add(i: number) {
    setCart((c) => ({ ...c, [i]: (c[i] || 0) + 1 }));
  }
  function sub(i: number) {
    setCart((c) => {
      const next = { ...c, [i]: Math.max(0, (c[i] || 0) - 1) };
      if (next[i] === 0) delete next[i];
      return next;
    });
  }

  const linhas = Object.entries(cart)
    .map(([i, qtd]) => {
      const idx = Number(i);
      const p = catalog.p[idx];
      if (!p) return null;
      return { idx, nome: p.n, preco: p.v, qtd };
    })
    .filter(Boolean) as { idx: number; nome: string; preco: number; qtd: number }[];

  const total = linhas.reduce((s, it) => s + it.preco * it.qtd, 0);

  function finalizar() {
    if (linhas.length === 0) return;
    if (!nome.trim() || !whats.trim()) {
      alert("Preencha seu nome e WhatsApp para enviar o pedido.");
      return;
    }
    const texto = linhas
      .map((it) => `• ${it.qtd}x ${it.nome} — ${brl(it.preco * it.qtd)}`)
      .join("\n");
    const msg = `Olá! Meu nome é ${nome}.\nMeu WhatsApp: ${whats}\n\nGostaria de fazer o pedido:\n${texto}\n\nTotal: ${brl(total)}`;
    const numero = (catalog.w || "").replace(/\D/g, "");
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <h1 className="font-display text-2xl font-semibold">{catalog.n}</h1>
          <p className="text-sm text-muted-foreground">
            Escolha seus produtos e finalize pelo WhatsApp.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            {catalog.p.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto disponível no momento.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {catalog.p.map((p, i) => (
                  <Card
                    key={i}
                    className="overflow-hidden rounded-3xl border-border/60 shadow-[var(--shadow-card)]"
                  >
                    <div className="aspect-square bg-gradient-to-br from-accent/40 to-secondary grid place-items-center">
                      <Gift className="h-14 w-14 text-muted-foreground/60" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold">{p.n}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-display text-lg font-semibold">{brl(p.v)}</p>
                        <Button
                          size="sm"
                          className="rounded-full gap-1.5 h-8"
                          onClick={() => add(i)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card className="sticky top-4 h-fit rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Carrinho
            </h2>
            {linhas.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Adicione produtos para montar seu pedido.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border/60 text-sm">
                {linhas.map((it) => (
                  <li key={it.idx} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{it.nome}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => sub(it.idx)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs">{it.qtd}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={() => add(it.idx)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <span className="font-display font-semibold">
                      {brl(it.preco * it.qtd)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-semibold">{brl(total)}</span>
            </div>
            <div className="mt-5 space-y-2.5">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Seu nome
                </Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="mt-1 h-11 rounded-full border-border/70 bg-background px-4"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Seu WhatsApp
                </Label>
                <Input
                  value={whats}
                  onChange={(e) => setWhats(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-1 h-11 rounded-full border-border/70 bg-background px-4"
                />
              </div>
              <Button
                className="mt-2 w-full rounded-full bg-success text-primary-foreground gap-2 h-11 hover:bg-success/90"
                onClick={finalizar}
                disabled={linhas.length === 0}
              >
                <MessageCircle className="h-4 w-4" /> Enviar pedido no WhatsApp
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
