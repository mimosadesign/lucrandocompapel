import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { useLocalState, brl } from "@/lib/storage";
import { CONTAS_KEY, totalContasDoMes, type Conta } from "@/lib/contas";

export const Route = createFileRoute("/decimo-terceiro")({
  head: () => ({
    meta: [
      { title: "Décimo Terceiro Salário — Lucrando com Papel" },
      { name: "description", content: "Estimativa do seu décimo terceiro com base no resultado real do seu negócio." },
      { property: "og:title", content: "Décimo Terceiro Salário — Lucrando com Papel" },
      { property: "og:description", content: "Estimativa do seu décimo terceiro com base no resultado real do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DecimoTerceiroPage,
});

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CATS_CUSTO = ["Materiais", "Embalagens", "Matéria-prima", "Insumos"];

type Pedido = { valor?: number; valorEntrega?: number; status?: string; entrega?: string; criadoEm?: string };
type Lanc = { tipo: "entrada" | "saida"; data: string; valor: number; categoria?: string };

function DecimoTerceiroPage() {
  return (
    <DiamondLock
      title="Seu décimo terceiro, calculado pelo seu negócio"
      description="Veja quanto o seu ateliê pode pagar de décimo terceiro para você no fim do ano."
      preview={<DecimoConteudo />}
    />
  );
}

function DecimoConteudo() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [caixa] = useLocalState<Lanc[]>("lcp:caixa:lancamentos", []);
  const [contas] = useLocalState<Conta[]>(CONTAS_KEY, []);
  const [trabalho] = useLocalState<Record<string, number>>("lcp:precif:trabalho", {});

  const r = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const m = MESES.map(() => ({ receita: 0, custos: 0, despesas: 0, contas: 0 }));
    // Receita: pedidos (data de entrega, ou criação) não cancelados
    for (const p of pedidos) {
      if (p.status === "Cancelado") continue;
      const d = new Date(p.entrega || p.criadoEm || "");
      if (isNaN(d.getTime()) || d.getFullYear() !== ano) continue;
      m[d.getMonth()].receita += (p.valor || 0) + (p.valorEntrega || 0);
    }
    // Saídas do caixa: custos de produção x despesas operacionais
    for (const l of caixa) {
      if (l.tipo !== "saida") continue;
      const d = new Date(`${l.data}T12:00`);
      if (isNaN(d.getTime()) || d.getFullYear() !== ano) continue;
      if (CATS_CUSTO.includes(l.categoria || "")) m[d.getMonth()].custos += l.valor || 0;
      else m[d.getMonth()].despesas += l.valor || 0;
    }
    for (let i = 0; i <= mesAtual; i++) m[i].contas = totalContasDoMes(contas, new Date(ano, i, 15));

    const liq = m.map((x) => x.receita - x.custos - x.despesas - x.contas);
    const ate = m.slice(0, mesAtual + 1);
    const soma = (k: "receita" | "custos" | "despesas" | "contas") => ate.reduce((s, x) => s + x[k], 0);
    const receita = soma("receita");
    const custos = soma("custos");
    const despesas = soma("despesas");
    const contasT = soma("contas");
    const bruto = receita - custos;
    const liquido = bruto - despesas - contasT;
    const mesesComDados = ate.filter((x) => x.receita || x.custos || x.despesas).length;
    const liqMeses = liq.slice(0, mesAtual + 1).filter((_, i) => ate[i].receita || ate[i].custos || ate[i].despesas);
    const media = mesesComDados ? liqMeses.reduce((s, v) => s + v, 0) / mesesComDados : 0;
    const ord = [...liqMeses].sort((a, b) => a - b);
    const n3 = Math.min(3, ord.length);
    const mediaDe = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const restantes = 11 - mesAtual;
    const proj = (mensal: number) => Math.max(0, (liquido + mensal * restantes) / 12);

    const atual = Math.max(0, liquido / 12);
    const realista = proj(media);
    const evol = MESES.map((nome, i) => {
      const acum = liq.slice(0, Math.min(i, mesAtual) + 1).reduce((s, v) => s + v, 0) + (i > mesAtual ? media * (i - mesAtual) : 0);
      return { nome, valor: Math.max(0, acum / 12), projetado: i > mesAtual };
    });
    return {
      receita, custos, despesas, contasT, bruto, liquido, atual, realista, evol, restantes, mesesComDados,
      conservador: proj(mediaDe(ord.slice(0, n3))),
      otimista: proj(mediaDe(ord.slice(-n3))),
      media,
    };
  }, [pedidos, caixa, contas]);

  const proLabore = Number(trabalho?.proLabore) || 0;
  const semDados = r.mesesComDados === 0;
  const dif = r.realista - r.atual;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Décimo Terceiro Salário"
        description="Uma projeção automática do décimo terceiro que o seu negócio pode pagar a você no fim do ano, com base no que você registrou."
      />

      {semDados ? (
        <Card className="rounded-3xl p-6 text-sm text-muted-foreground">
          Ainda não há pedidos ou lançamentos no Caixa Diário este ano. Registre seus pedidos e saídas para o aplicativo calcular sua estimativa.
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-3xl border-primary/40 bg-primary/10 p-6 text-center">
            <p className="text-sm text-muted-foreground">Estimativa do Décimo Terceiro Salário (projeção para dezembro)</p>
            <p className="mt-2 font-display text-4xl font-semibold text-primary">{brl(r.realista)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Estimativa baseada nos dados registrados — não é um valor garantido.</p>
          </Card>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {[
              ["Receitas acumuladas", r.receita],
              ["Custos", r.custos],
              ["Despesas", r.despesas],
              ["Contas a pagar", r.contasT],
              ["Lucro bruto", r.bruto],
              ["Lucro líquido", r.liquido],
            ].map(([l, v]) => (
              <Card key={l as string} className="rounded-2xl p-4">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className={`mt-1 font-semibold ${(v as number) < 0 ? "text-destructive" : ""}`}>{brl(v as number)}</p>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl p-5">
            <p className="font-display text-lg font-semibold">Quanto falta</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div><p className="text-muted-foreground">Estimativa atual</p><p className="text-lg font-semibold">{brl(r.atual)}</p></div>
              <div><p className="text-muted-foreground">Projeção para o final do ano</p><p className="text-lg font-semibold">{brl(r.realista)}</p></div>
              <div><p className="text-muted-foreground">Diferença</p><p className="text-lg font-semibold">{brl(dif)}</p></div>
            </div>
            {r.restantes > 0 && dif > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Valor médio necessário por mês (para reservar): <b className="text-foreground">{brl(dif / r.restantes)}</b>
              </p>
            )}
          </Card>

          <Card className="rounded-3xl p-5">
            <p className="font-display text-lg font-semibold">Evolução ao longo do ano</p>
            <p className="text-xs text-muted-foreground">Meses futuros usam a sua média atual.</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.evol}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" fontSize={11} />
                  <YAxis fontSize={11} width={60} tickFormatter={(v) => `R$${Math.round(v)}`} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Bar dataKey="valor" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {r.mesesComDados >= 2 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Conservador", r.conservador, "Repete a média dos seus meses mais fracos."],
                ["Realista", r.realista, "Repete a sua média mensal atual."],
                ["Otimista", r.otimista, "Repete a média dos seus melhores meses."],
              ].map(([t, v, d]) => (
                <Card key={t as string} className="rounded-2xl p-4">
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="mt-1 text-xl font-semibold">{brl(v as number)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="rounded-3xl p-5 text-sm">
            <p className="font-display text-lg font-semibold">Como calculamos sua estimativa?</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li><b>Receitas:</b> soma dos seus pedidos deste ano (exceto cancelados).</li>
              <li><b>Custos:</b> saídas do Caixa Diário de materiais e embalagens.</li>
              <li><b>Despesas:</b> demais saídas do Caixa Diário.</li>
              <li><b>Contas a pagar:</b> contas cadastradas de cada mês até agora.</li>
              <li><b>Lucro líquido</b> = receitas − custos − despesas − contas. É o que realmente sobrou para você.</li>
              <li>Como no décimo terceiro tradicional, cada mês vale <b>1/12</b>: a estimativa atual é o lucro líquido acumulado ÷ 12.</li>
              <li>A projeção soma ao acumulado a sua média mensal ({brl(r.media)}) nos {r.restantes} meses que faltam, e divide por 12.</li>
            </ul>
            {proLabore > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Referência: pelo pró-labore definido em Precificação ({brl(proLabore)}/mês), o décimo terceiro ideal seria {brl(proLabore)}.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
