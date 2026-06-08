import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Plus, MessageCircle, Gift } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo digital — Lucrando com Papel" }] }),
  component: CatalogoPage,
});

const itens = [
  { nome: "Convite digital", preco: 12.0 },
  { nome: "Caderno A5 personalizado", preco: 38.0 },
  { nome: "Kit festa Princesa", preco: 89.0 },
  { nome: "Topo de bolo Maternidade", preco: 24.5 },
  { nome: "Caixa Páscoa surpresa", preco: 18.0 },
  { nome: "Etiqueta personalizada", preco: 0.5 },
];

function CatalogoPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Catálogo digital"
        description="Sua vitrine online — clientes escolhem produtos e finalizam direto no seu WhatsApp."
        actions={
          <Button variant="outline" className="rounded-full border-foreground/20 gap-2">
            <ShoppingBag className="h-4 w-4" /> Ver como cliente
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((p) => (
            <Card
              key={p.nome}
              className="group overflow-hidden rounded-3xl border-border/60 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="aspect-square bg-gradient-to-br from-accent/40 to-secondary grid place-items-center">
                <Gift className="h-14 w-14 text-muted-foreground/60" />
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-semibold">{p.nome}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-display text-lg font-semibold">
                    R$ {p.preco.toFixed(2).replace(".", ",")}
                  </p>
                  <Button size="sm" className="rounded-full gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="sticky top-20 h-fit rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Carrinho
          </h2>
          <ul className="mt-4 divide-y divide-border/60 text-sm">
            {[
              { n: "Kit festa Princesa", q: 1, p: 89.0 },
              { n: "Caderno A5", q: 2, p: 76.0 },
            ].map((it) => (
              <li key={it.n} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{it.n}</p>
                  <p className="text-xs text-muted-foreground">x{it.q}</p>
                </div>
                <span className="font-display font-semibold">
                  R$ {it.p.toFixed(2).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border/60 pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl font-semibold">R$ 165,00</span>
          </div>
          <div className="mt-5 space-y-2.5">
            <Input
              placeholder="Seu nome"
              className="h-11 rounded-full border-border/70 bg-background px-4"
            />
            <Button className="w-full rounded-full bg-success text-primary-foreground gap-2 h-11 hover:bg-success/90">
              <MessageCircle className="h-4 w-4" /> Finalizar no WhatsApp
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
