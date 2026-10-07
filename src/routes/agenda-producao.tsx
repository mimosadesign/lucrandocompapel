import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalState } from "@/lib/storage";

export const Route = createFileRoute("/agenda-producao")({
  head: () => ({
    meta: [
      { title: "Agenda de Produção — Lucrando com Papel" },
      { name: "description", content: "Planeje a produção da semana e veja o tempo necessário de cada dia." },
      { property: "og:title", content: "Agenda de Produção — Lucrando com Papel" },
      { property: "og:description", content: "Planeje a produção da semana e veja o tempo necessário de cada dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
type Tarefa = { id: string; dia: string; descricao: string; quantidade: number; minutosPorUn: number };

function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Agenda de Produção" diamond description="Planeje o que produzir em cada dia — o app soma automaticamente o tempo necessário." />
      <DiamondLock title="Planeje sua semana de produção" description="Distribua tarefas por dia e saiba quantas horas cada dia vai exigir." preview={<Conteudo />} />
    </div>
  );
}

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

function Conteudo() {
  const [tarefas, setTarefas] = useLocalState<Tarefa[]>("lcp:agendaProducao", []);
  const [trabalho] = useLocalState<Record<string, string>>("lcp:precif:trabalho", {});
  const horasDia = parseFloat(String(trabalho.horasDia || "").replace(",", ".")) || 0;
  const [novo, setNovo] = useState({ dia: DIAS[0], descricao: "", quantidade: 1, minutosPorUn: 0 });

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 grid gap-2 sm:grid-cols-[1fr_2fr_1fr_1fr_auto] items-end">
        <select value={novo.dia} onChange={(e) => setNovo({ ...novo, dia: e.target.value })} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          {DIAS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <Input placeholder="Caixas Milk, tags, acabamento…" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
        <Input type="number" min={1} placeholder="Qtd" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: Math.max(1, Number(e.target.value)) })} />
        <Input type="number" min={0} placeholder="Min por unidade" value={novo.minutosPorUn || ""} onChange={(e) => setNovo({ ...novo, minutosPorUn: Math.max(0, Number(e.target.value)) })} />
        <Button className="rounded-full gap-2" onClick={() => {
          if (!novo.descricao.trim()) return;
          setTarefas((p) => [...p, { id: crypto.randomUUID(), ...novo }]);
          setNovo({ ...novo, descricao: "", quantidade: 1, minutosPorUn: 0 });
        }}><Plus className="h-4 w-4" /> Adicionar</Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {DIAS.map((d) => {
          const doDia = tarefas.filter((t) => t.dia === d);
          if (!doDia.length) return null;
          const total = doDia.reduce((s, t) => s + t.quantidade * t.minutosPorUn, 0);
          const excede = horasDia > 0 && total > horasDia * 60;
          return (
            <Card key={d} className="rounded-3xl p-5">
              <div className="flex justify-between items-baseline">
                <p className="font-display text-lg font-semibold">{d}</p>
                <p className={`text-sm font-semibold ${excede ? "text-destructive" : "text-primary"}`}>{fmt(total)}</p>
              </div>
              {excede && <p className="text-xs text-destructive">Passa das suas {horasDia}h de trabalho por dia.</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {doDia.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span>{t.quantidade} × {t.descricao} <span className="text-xs text-muted-foreground">{t.minutosPorUn > 0 ? `(${fmt(t.quantidade * t.minutosPorUn)})` : "(sem tempo definido)"}</span></span>
                    <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setTarefas((p) => p.filter((x) => x.id !== t.id))}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      {tarefas.length === 0 && <Card className="rounded-3xl p-6 text-sm text-muted-foreground">Nenhuma tarefa planejada ainda.</Card>}
    </div>
  );
}
