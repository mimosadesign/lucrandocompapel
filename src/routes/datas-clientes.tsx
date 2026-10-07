import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalState } from "@/lib/storage";

export const Route = createFileRoute("/datas-clientes")({
  head: () => ({
    meta: [
      { title: "Datas Importantes dos Clientes — Lucrando com Papel" },
      { name: "description", content: "Aniversários, casamentos e próximas festas dos clientes com alertas para vender mais." },
      { property: "og:title", content: "Datas Importantes dos Clientes — Lucrando com Papel" },
      { property: "og:description", content: "Aniversários, casamentos e próximas festas dos clientes com alertas para vender mais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const TIPOS = ["Aniversário", "Aniversário do filho(a)", "Casamento", "Data comemorativa", "Próxima festa"];
type Data = { id: string; cliente: string; tipo: string; pessoa: string; data: string; telefone: string };

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Datas Importantes dos Clientes" diamond description="Cadastre aniversários, casamentos e festas — o app avisa com antecedência para você oferecer seus produtos." />
      <DiamondLock title="Venda antes do cliente pedir" description="Alertas de aniversários e festas dos seus clientes, com mensagem pronta no WhatsApp." preview={<Conteudo />} />
    </div>
  );
}

function diasAte(iso: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00");
  const prox = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
  if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
  return Math.round((prox.getTime() - hoje.getTime()) / 86400000);
}

function Conteudo() {
  const [datas, setDatas] = useLocalState<Data[]>("lcp:datasClientes", []);
  const [n, setN] = useState({ cliente: "", tipo: TIPOS[0], pessoa: "", data: "", telefone: "" });
  const ordenadas = useMemo(() => datas.filter((d) => d.data).map((d) => ({ ...d, faltam: diasAte(d.data) })).sort((a, b) => a.faltam - b.faltam), [datas]);
  const proximas = ordenadas.filter((d) => d.faltam <= 30);

  return (
    <div className="space-y-4">
      {proximas.length > 0 && (
        <Card className="rounded-3xl p-5 border-primary/30 bg-primary/5 space-y-2">
          <p className="font-semibold">Próximos 30 dias</p>
          {proximas.map((d) => {
            const quem = d.pessoa ? `${d.pessoa} (${d.cliente})` : d.cliente;
            const msg = `Oi ${d.cliente}! Vi que ${d.tipo.toLowerCase()}${d.pessoa ? ` de ${d.pessoa}` : ""} está chegando. Que tal deixar a festa ainda mais especial com papelaria personalizada? 💕`;
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>🎂 {d.tipo} de {quem} {d.faltam === 0 ? "é hoje!" : `é daqui a ${d.faltam} dia(s).`}</span>
                {d.telefone && <a className="text-primary underline text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/55${d.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`}>Enviar mensagem</a>}
              </div>
            );
          })}
        </Card>
      )}
      <Card className="rounded-3xl p-5 grid gap-2 sm:grid-cols-6 items-end">
        <Input placeholder="Cliente" value={n.cliente} onChange={(e) => setN({ ...n, cliente: e.target.value })} />
        <select value={n.tipo} onChange={(e) => setN({ ...n, tipo: e.target.value })} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <Input placeholder="De quem? (ex.: filha Ana)" value={n.pessoa} onChange={(e) => setN({ ...n, pessoa: e.target.value })} />
        <Input type="date" value={n.data} onChange={(e) => setN({ ...n, data: e.target.value })} />
        <Input placeholder="WhatsApp" value={n.telefone} onChange={(e) => setN({ ...n, telefone: e.target.value })} />
        <Button className="rounded-full gap-2" onClick={() => {
          if (!n.cliente.trim() || !n.data) return;
          setDatas((p) => [...p, { id: crypto.randomUUID(), ...n }]);
          setN({ ...n, pessoa: "", data: "" });
        }}><Plus className="h-4 w-4" /> Salvar</Button>
      </Card>
      <Card className="rounded-3xl p-5">
        {ordenadas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma data cadastrada.</p> : (
          <ul className="space-y-2 text-sm">
            {ordenadas.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span><b>{d.cliente}</b> · {d.tipo}{d.pessoa ? ` (${d.pessoa})` : ""} · {new Date(d.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} <span className="text-xs text-muted-foreground">— faltam {d.faltam} dia(s)</span></span>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setDatas((p) => p.filter((x) => x.id !== d.id))}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
