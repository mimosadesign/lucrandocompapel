import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";

export const Route = createFileRoute("/inteligencia")({
  head: () => ({ meta: [{ title: "Inteligência Financeira — Lucrando com Papel" }] }),
  component: InteligenciaPage,
});

function InteligenciaPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Inteligência Financeira"
        diamond
        description="Sua mentora financeira: break-even, cenários, simuladores de desconto e contratação, análise de dependência e sazonalidade."
      />
      <DiamondLock
        title="Tome decisões com a clareza de uma CEO"
        description="Descubra seu ponto de equilíbrio, simule cenários (conservador, realista, agressivo), veja quais produtos te dão mais lucro e receba sugestões para crescer com segurança."
      />
    </div>
  );
}
