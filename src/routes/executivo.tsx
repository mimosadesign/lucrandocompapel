import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";

export const Route = createFileRoute("/executivo")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — Lucrando com Papel" }] }),
  component: ExecutivoPage,
});

function ExecutivoPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard Executivo"
        diamond
        description="Visão de CEO do seu ateliê: score de saúde, alertas inteligentes, fila de produção em kanban e plano de ação automático."
      />
      <DiamondLock
        title="Sua mentora financeira em um painel só"
        description="Score de 0 a 100, alertas como 'seu lucro caiu 12% esse mês', gargalos identificados e plano de ação automático para resolver."
      />
    </div>
  );
}
