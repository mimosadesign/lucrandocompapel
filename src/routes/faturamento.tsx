import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";

export const Route = createFileRoute("/faturamento")({
  head: () => ({ meta: [{ title: "Faturamento Mensal — Lucrando com Papel" }] }),
  component: FaturamentoPage,
});

function FaturamentoPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Faturamento Mensal"
        diamond
        description="Acompanhe sua meta, lucro real e evolução mês a mês — com aquela celebração quando bater a meta 🎉"
      />
      <DiamondLock
        title="Veja todo o dinheiro que passa pelo seu ateliê"
        description="Painel completo com meta vs realizado, detalhamento de custos, controle de caixa real, lucro líquido e histórico mês a mês com gráficos."
      />
    </div>
  );
}
