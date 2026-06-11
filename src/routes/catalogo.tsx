import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Plus, Minus, MessageCircle, Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalState, brl } from "@/lib/storage";
import type { Produto } from "./produtos";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo digital — Lucrando com Papel" }] }),
  component: CatalogoPage,
});

function CatalogoPage() {
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useLocalState<string>("lcp:whats", "");

  const itens = useMemo(
    () =>
      produtos.map((p) => ({
        ...p,
        preco: p.custo * (1 + p.margemPct / 100),
      })),
    [produtos],
  );

  function add(id: string) {
    setCarrinho((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function sub(id: string) {
    setCarrinho((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] || 0) - 1) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  }

  const carrinhoLista = Object.entries(carrinho)
    .map(([id, qtd]) => {
      const p = itens.find((x) => x.id === id);
      return p ? { id, nome: p.nome, qtd, preco: p.preco } : null;
    })
    .filter(Boolean) as { id: string; nome: string; qtd: number; preco: number }[];

  const total = carrinhoLista.reduce((s, it) => s + it.preco * it.qtd, 0);

  function finalizar() {
    if (carrinhoLista.length === 0) return;
    const linhas = carrinhoLista
      .map((it) => `• ${it.qtd}x ${it.nome} — ${brl(it.preco * it.qtd)}`)
      .join("\n");
    const msg = `Olá! Meu nome é ${nome || "(cliente)"}.\nGostaria de fazer o pedido:\n${linhas}\n\nTotal: ${brl(total)}`;
    const numero = whats.replace(/\D/g, "");
    const url = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Catálogo digital"
        description="Sua vitrine online — clientes escolhem produtos e finalizam direto no seu WhatsApp."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {itens.length === 0 ? (
            <Card className="rounded-3xl border-border/60 p-10 text-center text-muted-foreground shadow-[var(--shadow-card)]">
              <Gift className="mx-auto mb-3 h-8 w-8 opacity-60" />
              <p className="font-medium">Seu catálogo está vazio.</p>
              <p className="text-sm">
                Cadastre produtos em <Link to="/produtos" className="underline">Produtos</Link> e eles aparecerão aqui.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map((p) => (
                <Card
                  key={p.id}
                  className="group overflow-hidden rounded-3xl border-border/60 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="aspect-square bg-gradient-to-br from-accent/40 to-secondary grid place-items-center">
                    <Gift className="h-14 w-14 text-muted-foreground/60" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base font-semibold">{p.nome}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="font-display text-lg font-semibold">{brl(p.preco)}</p>
                      <Button size="sm" className="rounded-full gap-1.5 h-8" onClick={() => add(p.id)}>
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="sticky top-20 h-fit rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Carrinho
          </h2>
          {carrinhoLista.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Adicione produtos para montar um pedido.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 text-sm">
              {carrinhoLista.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{it.nome}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => sub(it.id)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs">{it.qtd}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => add(it.id)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <span className="font-display font-semibold">{brl(it.preco * it.qtd)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-semibold">{brl(total)}</span>
          </div>
          <div className="mt-5 space-y-2.5">
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-full border-border/70 bg-background px-4"
            />
            <Input
              placeholder="WhatsApp do ateliê (DDI+DDD+nº)"
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              className="h-11 rounded-full border-border/70 bg-background px-4"
            />
            <Button
              className="w-full rounded-full bg-success text-primary-foreground gap-2 h-11 hover:bg-success/90"
              onClick={finalizar}
              disabled={carrinhoLista.length === 0}
            >
              <MessageCircle className="h-4 w-4" /> Finalizar no WhatsApp
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
