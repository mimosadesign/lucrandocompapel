import { useMemo } from "react";
import { ShoppingCart, Factory, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalState, brl } from "@/lib/storage";

type MaterialRow = {
  id: string;
  nome: string;
  valorPago: number;
  quantidade: number;
  estoque: number;
};

type PrecItemRow = {
  id: string;
  nome: string;
  materiais: { materialId: string; quantidade: number }[];
};

type PedidoRow = {
  id: string;
  produto?: string;
  entrega?: string;
  status: string;
};

function unit(m: MaterialRow) {
  return m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
}

export function ComprasInteligentes({ materiais }: { materiais: MaterialRow[] }) {
  const [precItens] = useLocalState<PrecItemRow[]>("lcp:precItens", []);
  const [pedidos] = useLocalState<PedidoRow[]>("lcp:pedidos", []);

  const necessidade = useMemo(() => {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(hoje.getDate() + 7);
    const need: Record<string, number> = {};
    for (const p of pedidos) {
      if (p.status === "Cancelado" || p.status === "Concluído" || p.status === "Entregue")
        continue;
      if (!p.entrega) continue;
      const d = new Date(p.entrega);
      if (!isFinite(d.getTime()) || d > limite) continue;
      const receita = precItens.find(
        (i) => i.nome.trim().toLowerCase() === (p.produto ?? "").trim().toLowerCase(),
      );
      if (!receita) continue;
      for (const im of receita.materiais) {
        need[im.materialId] = (need[im.materialId] ?? 0) + im.quantidade;
      }
    }
    return Object.entries(need)
      .map(([materialId, qtd]) => {
        const m = materiais.find((x) => x.id === materialId);
        if (!m) return null;
        const faltando = Math.max(0, qtd - (m.estoque ?? 0));
        return { m, qtd, faltando, custo: faltando * unit(m) };
      })
      .filter(Boolean) as { m: MaterialRow; qtd: number; faltando: number; custo: number }[];
  }, [pedidos, precItens, materiais]);

  const comprar = necessidade.filter((n) => n.faltando > 0);
  const investimento = comprar.reduce((s, n) => s + n.custo, 0);

  const capacidade = useMemo(() => {
    return precItens
      .map((i) => {
        if (!i.materiais.length) return null;
        let min = Infinity;
        for (const im of i.materiais) {
          const m = materiais.find((x) => x.id === im.materialId);
          if (!m || im.quantidade <= 0) continue;
          min = Math.min(min, Math.floor((m.estoque ?? 0) / im.quantidade));
        }
        if (!isFinite(min)) return null;
        return { nome: i.nome || "Item sem nome", podeProduzir: min };
      })
      .filter(Boolean)
      .slice(0, 8) as { nome: string; podeProduzir: number }[];
  }, [precItens, materiais]);

  function compartilhar() {
    const linhas = comprar.map((n) => `• ${n.faltando} ${n.m.nome}`).join("\n");
    const texto = `🛒 Lista de compras da semana:\n${linhas}\n\nInvestimento estimado: ${brl(investimento)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">Lista Inteligente de Compras</p>
            <p className="text-sm text-muted-foreground">
              Com base nos pedidos com entrega nos próximos 7 dias e nas fórmulas dos itens.
            </p>
          </div>
        </div>

        {comprar.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada a comprar por enquanto. Cadastre itens em “Precificar item” com os materiais
            usados e informe a data de entrega dos pedidos para a lista aparecer.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {comprar.map((n) => (
                <div
                  key={n.m.id}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{n.m.nome}</span>
                  <Badge variant="secondary" className="rounded-full">
                    precisa {n.qtd}
                  </Badge>
                  <strong>comprar {n.faltando}</strong>
                  <span className="text-muted-foreground">{brl(n.custo)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                Investimento estimado: <strong>{brl(investimento)}</strong>
              </p>
              <Button className="rounded-full gap-2" onClick={compartilhar}>
                <Share2 className="h-4 w-4" /> Enviar no WhatsApp
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
            <Factory className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">Quanto ainda consigo produzir?</p>
            <p className="text-sm text-muted-foreground">
              Quantidade possível com o estoque atual de materiais.
            </p>
          </div>
        </div>

        {capacidade.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Salve itens em “Precificar item” com os materiais usados para ver sua capacidade.
          </p>
        ) : (
          <div className="space-y-1.5">
            {capacidade.map((c) => (
              <div
                key={c.nome}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                <Badge
                  className="rounded-full"
                  variant={c.podeProduzir === 0 ? "destructive" : "secondary"}
                >
                  {c.podeProduzir} un.
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
