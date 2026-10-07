import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/money-input";
import { useLocalState } from "@/lib/storage";

export const Route = createFileRoute("/envios")({
  head: () => ({
    meta: [
      { title: "Controle de Envios — Lucrando com Papel" },
      { name: "description", content: "Acompanhe status, rastreio, frete e retirada de cada pedido." },
      { property: "og:title", content: "Controle de Envios — Lucrando com Papel" },
      { property: "og:description", content: "Acompanhe status, rastreio, frete e retirada de cada pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const ETAPAS = ["Pedido recebido", "Produção", "Finalizado", "Aguardando retirada", "Entregue"] as const;
type Envio = { etapa: string; prevista: string; forma: string; rastreio: string; frete: number; retirada: string };
type Pedido = { id: string; cliente?: string; produto?: string; status?: string; entrega?: string };
const vazio: Envio = { etapa: ETAPAS[0], prevista: "", forma: "", rastreio: "", frete: 0, retirada: "" };

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Controle de Envios" diamond description="Do pedido recebido até a entrega: forma de envio, código de rastreio, frete e retirada." />
      <DiamondLock title="Nunca perca um envio de vista" description="Acompanhe cada pedido até a entrega, com rastreio dos Correios e frete." preview={<Conteudo />} />
    </div>
  );
}

function Conteudo() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [envios, setEnvios] = useLocalState<Record<string, Envio>>("lcp:envios", {});
  const ativos = pedidos.filter((p) => p.status !== "Cancelado");
  const set = (id: string, patch: Partial<Envio>) => setEnvios((e) => ({ ...e, [id]: { ...vazio, ...e[id], ...patch } }));

  if (!ativos.length) return <Card className="rounded-3xl p-6 text-sm text-muted-foreground">Cadastre pedidos para controlar os envios aqui.</Card>;
  return (
    <div className="space-y-3">
      {ativos.map((p) => {
        const e = { ...vazio, ...envios[p.id] };
        const idx = ETAPAS.indexOf(e.etapa as (typeof ETAPAS)[number]);
        return (
          <Card key={p.id} className="rounded-3xl p-5 space-y-3">
            <p className="font-semibold">{p.cliente || "Cliente"} · <span className="text-muted-foreground font-normal">{p.produto || "Pedido"}</span></p>
            <div className="flex flex-wrap gap-1">
              {ETAPAS.map((et, i) => (
                <button key={et} type="button" onClick={() => set(p.id, { etapa: et })}
                  className={`rounded-full px-3 py-1 text-xs border ${i <= idx ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {et}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              <div><Label className="text-xs">Data prevista</Label><Input type="date" value={e.prevista || p.entrega?.slice(0, 10) || ""} onChange={(x) => set(p.id, { prevista: x.target.value })} /></div>
              <div><Label className="text-xs">Forma de entrega</Label>
                <select value={e.forma} onChange={(x) => set(p.id, { forma: x.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">Escolha</option><option>Correios (PAC)</option><option>Correios (SEDEX)</option><option>Retirada</option><option>Motoboy</option><option>Entrega própria</option><option>Transportadora</option>
                </select></div>
              <div><Label className="text-xs">Código de rastreio</Label><Input value={e.rastreio} onChange={(x) => set(p.id, { rastreio: x.target.value.toUpperCase() })} /></div>
              <div><Label className="text-xs">Valor do frete</Label><MoneyInput value={e.frete} onChange={(n) => set(p.id, { frete: n })} /></div>
              <div><Label className="text-xs">Data da retirada</Label><Input type="date" value={e.retirada} onChange={(x) => set(p.id, { retirada: x.target.value })} /></div>
            </div>
            {e.rastreio && e.forma.startsWith("Correios") && (
              <a className="text-xs text-primary underline" target="_blank" rel="noreferrer" href={`https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(e.rastreio)}`}>Rastrear nos Correios</a>
            )}
          </Card>
        );
      })}
    </div>
  );
}
