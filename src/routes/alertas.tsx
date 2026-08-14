import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Package,
  TrendingDown,
  Receipt,
  FileText,
  Users,
  Target,
  ArrowUpRight,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalState, brl, monthKey, parseNum } from "@/lib/storage";
import { CONTAS_KEY, contaPaga, contasDoMes, vencimentoNoMes, type Conta } from "@/lib/contas";
import { HISTORICO_KEY, type PrecoHistorico } from "@/components/alertas-custo";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Central de Alertas — Lucrando com Papel" },
      {
        name: "description",
        content:
          "O app encontra sozinho os problemas do seu ateliê: estoque baixo, margem apertada, contas vencendo e metas em risco.",
      },
      { property: "og:title", content: "Central de Alertas — Lucrando com Papel" },
      {
        property: "og:description",
        content: "Avisos automáticos de estoque, margem, contas, orçamentos parados e clientes sumidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertasPage,
});

type Material = {
  id: string;
  nome: string;
  valorPago: number;
  quantidade: number;
  estoque: number;
  estoqueMinimo: number;
};
type Produto = { id: string; nome: string; custo: number; margemPct: number };
type Pedido = {
  id: string;
  cliente: string;
  produto?: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
  criadoEm?: string;
};
type Orcamento = {
  id: string;
  numero: string;
  cliente: string;
  criadoEm: string;
  status?: string;
  aceito?: boolean;
  itens: { quantidade: number; valorUnit: number }[];
};

type Nivel = "alto" | "medio" | "baixo";
type Alerta = {
  id: string;
  nivel: Nivel;
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
  acaoLabel?: string;
  acaoUrl?: string;
};

const MARGEM_MINIMA = 30;
const DIAS_CLIENTE_INATIVO = 60;
const DIAS_ORCAMENTO_PARADO = 7;
const AUMENTO_ALERTA = 5;

function AlertasPage() {
  const [materiais] = useLocalState<Material[]>("lcp:materiais", []);
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [orcamentos] = useLocalState<Orcamento[]>("lcp:orcamentos", []);
  const [contas] = useLocalState<Conta[]>(CONTAS_KEY, []);
  const [historico] = useLocalState<PrecoHistorico[]>(HISTORICO_KEY, []);
  const [meta] = useLocalState<number>("lcp:meta", 0);
  const [gastos] = useLocalState<{ id: string; nome: string; valor: string }[]>(
    "lcp:precif:gastos",
    [],
  );

  const alertas = useMemo<Alerta[]>(() => {
    const out: Alerta[] = [];
    const hoje = new Date();
    const mes = monthKey();
    const inicioDia = new Date().setHours(0, 0, 0, 0);

    // 1) Material abaixo do estoque mínimo
    for (const m of materiais) {
      if ((m.estoqueMinimo || 0) > 0 && (m.estoque || 0) <= m.estoqueMinimo) {
        out.push({
          id: `estoque-${m.id}`,
          nivel: (m.estoque || 0) === 0 ? "alto" : "medio",
          icone: <Package className="h-4 w-4" />,
          titulo: `Estoque baixo: ${m.nome}`,
          detalhe: `Restam ${m.estoque || 0} de um mínimo de ${m.estoqueMinimo}. Reponha antes de travar a produção.`,
          acaoLabel: "Ver materiais",
          acaoUrl: "/materiais",
        });
      }
    }

    // 2) Produto com margem baixa
    for (const p of produtos) {
      if ((p.margemPct || 0) > 0 && p.margemPct < MARGEM_MINIMA) {
        out.push({
          id: `margem-${p.id}`,
          nivel: p.margemPct < 15 ? "alto" : "medio",
          icone: <TrendingDown className="h-4 w-4" />,
          titulo: `Margem baixa: ${p.nome}`,
          detalhe: `Margem de ${p.margemPct.toFixed(0)}% — abaixo dos ${MARGEM_MINIMA}% recomendados. Reveja o preço.`,
          acaoLabel: "Ver produtos",
          acaoUrl: "/produtos",
        });
      }
    }

    // 3) Produto vendido abaixo do preço recomendado
    const precoRecomendado = new Map<string, number>();
    for (const p of produtos) {
      const margem = Math.min(90, Math.max(0, p.margemPct || 0));
      const preco = margem > 0 ? (p.custo || 0) / (1 - margem / 100) : (p.custo || 0);
      if (preco > 0) precoRecomendado.set(p.nome.trim().toLowerCase(), preco);
    }
    const abaixo = pedidos.filter((pd) => {
      if (pd.status === "Cancelado" || !pd.produto) return false;
      const rec = precoRecomendado.get(pd.produto.trim().toLowerCase());
      return !!rec && (pd.valor || 0) > 0 && pd.valor < rec * 0.95;
    });
    if (abaixo.length) {
      out.push({
        id: "preco-abaixo",
        nivel: "alto",
        icone: <Tag className="h-4 w-4" />,
        titulo: `${abaixo.length} pedido(s) vendidos abaixo do preço recomendado`,
        detalhe: abaixo
          .slice(0, 3)
          .map((p) => `${p.produto} (${brl(p.valor)})`)
          .join(" · "),
        acaoLabel: "Ver pedidos",
        acaoUrl: "/pedidos",
      });
    }

    // 4) Conta vencendo / vencida
    for (const c of contasDoMes(contas, hoje)) {
      if (contaPaga(c, mes)) continue;
      const v = vencimentoNoMes(c, hoje);
      if (!v) continue;
      const dias = Math.ceil((v.getTime() - inicioDia) / 86400000);
      if (dias < 0) {
        out.push({
          id: `conta-${c.id}`,
          nivel: "alto",
          icone: <Receipt className="h-4 w-4" />,
          titulo: `Conta vencida: ${c.nome}`,
          detalhe: `${brl(c.valor)} venceu em ${v.toLocaleDateString("pt-BR")}.`,
          acaoLabel: "Ver contas",
          acaoUrl: "/contas",
        });
      } else if (dias <= 5) {
        out.push({
          id: `conta-${c.id}`,
          nivel: "medio",
          icone: <Receipt className="h-4 w-4" />,
          titulo: `Conta vencendo: ${c.nome}`,
          detalhe: `${brl(c.valor)} vence em ${dias === 0 ? "hoje" : `${dias} dia(s)`} (${v.toLocaleDateString("pt-BR")}).`,
          acaoLabel: "Ver contas",
          acaoUrl: "/contas",
        });
      }
    }

    // 5) Orçamento parado
    for (const o of orcamentos) {
      const status = o.status || (o.aceito ? "Aprovado" : "Enviado");
      if (status === "Aprovado" || status === "Recusado") continue;
      const d = new Date(o.criadoEm);
      if (isNaN(d.getTime())) continue;
      const dias = Math.floor((inicioDia - d.getTime()) / 86400000);
      if (dias >= DIAS_ORCAMENTO_PARADO) {
        const valor = (o.itens || []).reduce((s, i) => s + i.quantidade * i.valorUnit, 0);
        out.push({
          id: `orc-${o.id}`,
          nivel: dias >= 15 ? "alto" : "medio",
          icone: <FileText className="h-4 w-4" />,
          titulo: `Orçamento parado há ${dias} dias`,
          detalhe: `#${o.numero} · ${o.cliente || "sem cliente"} · ${brl(valor)}. Faça um follow-up no WhatsApp.`,
          acaoLabel: "Ver orçamentos",
          acaoUrl: "/orcamentos",
        });
      }
    }

    // 6) Cliente sem comprar há 60 dias
    const ultimaCompra = new Map<string, { nome: string; data: number }>();
    for (const p of pedidos) {
      if (!p.cliente || p.status === "Cancelado") continue;
      const ref = p.entrega || p.criadoEm;
      if (!ref) continue;
      const d = new Date(ref);
      if (isNaN(d.getTime())) continue;
      const key = p.cliente.trim().toLowerCase();
      const atual = ultimaCompra.get(key);
      if (!atual || d.getTime() > atual.data) {
        ultimaCompra.set(key, { nome: p.cliente.trim(), data: d.getTime() });
      }
    }
    const inativos = [...ultimaCompra.values()].filter(
      (c) => (inicioDia - c.data) / 86400000 >= DIAS_CLIENTE_INATIVO,
    );
    if (inativos.length) {
      out.push({
        id: "clientes-inativos",
        nivel: "medio",
        icone: <Users className="h-4 w-4" />,
        titulo: `${inativos.length} cliente(s) sem comprar há mais de ${DIAS_CLIENTE_INATIVO} dias`,
        detalhe: inativos.slice(0, 4).map((c) => c.nome).join(" · "),
        acaoLabel: "Ver clientes",
        acaoUrl: "/clientes",
      });
    }

    // 7) Faturamento abaixo da meta
    const pedidosMes = pedidos.filter((p) => {
      if (p.status === "Cancelado") return false;
      const ref = p.entrega || p.criadoEm;
      if (!ref) return false;
      const d = new Date(ref);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === hoje.getMonth() &&
        d.getFullYear() === hoje.getFullYear()
      );
    });
    const faturamentoMes = pedidosMes.reduce(
      (s, p) => s + (p.valor || 0) + (p.valorEntrega || 0),
      0,
    );
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const progressoMes = hoje.getDate() / ultimoDia;
    if (meta > 0) {
      const esperado = meta * progressoMes;
      if (faturamentoMes < esperado * 0.8) {
        out.push({
          id: "meta-risco",
          nivel: "alto",
          icone: <Target className="h-4 w-4" />,
          titulo: "Faturamento abaixo da meta",
          detalhe: `Você faturou ${brl(faturamentoMes)} e o esperado a esta altura do mês era ${brl(esperado)} (meta ${brl(meta)}).`,
          acaoLabel: "Ver faturamento",
          acaoUrl: "/faturamento",
        });
      }
    }

    // 8) Custo de material que aumentou
    const porMaterial: Record<string, PrecoHistorico[]> = {};
    for (const h of historico) (porMaterial[h.materialId] ||= []).push(h);
    for (const regs of Object.values(porMaterial)) {
      const ord = [...regs].sort((a, b) => a.data.localeCompare(b.data));
      const atual = ord[ord.length - 1];
      const anterior = ord[ord.length - 2];
      if (!anterior || anterior.unitario <= 0) continue;
      const variacao = ((atual.unitario - anterior.unitario) / anterior.unitario) * 100;
      if (variacao >= AUMENTO_ALERTA) {
        out.push({
          id: `custo-${atual.materialId}`,
          nivel: variacao >= 20 ? "alto" : "medio",
          icone: <ArrowUpRight className="h-4 w-4" />,
          titulo: `Custo subiu ${variacao.toFixed(0)}%: ${atual.nome}`,
          detalhe: `De ${brl(anterior.unitario)} para ${brl(atual.unitario)} por unidade. Repasse no preço dos produtos que usam esse material.`,
          acaoLabel: "Ver materiais",
          acaoUrl: "/materiais",
        });
      }
    }

    // 9) Mês encaminhando para prejuízo
    const custosFixos = gastos.reduce((s, g) => s + parseNum(g.valor || ""), 0);
    const contasMes = contasDoMes(contas, hoje).reduce((s, c) => s + (c.valor || 0), 0);
    const despesasMes = custosFixos + contasMes;
    const margemMedia = (() => {
      const validos = produtos.filter((p) => (p.margemPct || 0) > 0);
      if (!validos.length) return 0;
      return validos.reduce((s, p) => s + p.margemPct, 0) / validos.length;
    })();
    const lucroBruto = faturamentoMes * (margemMedia / 100);
    const projecaoLucro = progressoMes > 0 ? lucroBruto / progressoMes : lucroBruto;
    if (despesasMes > 0 && projecaoLucro < despesasMes) {
      out.push({
        id: "prejuizo",
        nivel: "alto",
        icone: <AlertTriangle className="h-4 w-4" />,
        titulo: "Mês encaminhando para prejuízo",
        detalhe: `Projeção de lucro bruto de ${brl(projecaoLucro)} contra ${brl(despesasMes)} de despesas (contas + custos fixos). Aumente as vendas ou reveja seus preços.`,
        acaoLabel: "Ver inteligência financeira",
        acaoUrl: "/inteligencia",
      });
    }

    const ordem: Record<Nivel, number> = { alto: 0, medio: 1, baixo: 2 };
    return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  }, [materiais, produtos, pedidos, orcamentos, contas, historico, meta, gastos]);

  const altos = alertas.filter((a) => a.nivel === "alto").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Central de Alertas"
        description="O app procura sozinho os pontos de atenção do seu ateliê e te avisa antes do problema virar prejuízo."
      />

      <Card
        className={`rounded-3xl p-6 shadow-[var(--shadow-card)] ${
          altos > 0 ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"
        }`}
      >
        <div className="flex items-center gap-3">
          {altos > 0 ? (
            <AlertTriangle className="h-7 w-7 text-destructive" />
          ) : (
            <ShieldCheck className="h-7 w-7 text-success" />
          )}
          <div>
            <p className="font-display text-lg font-semibold">
              {alertas.length === 0
                ? "Tudo em ordem por aqui ✨"
                : `${alertas.length} ponto(s) de atenção`}
            </p>
            <p className="text-sm text-muted-foreground">
              {alertas.length === 0
                ? "Nenhum problema encontrado nos seus dados agora."
                : `${altos} urgente(s) · o restante pode ser resolvido com calma.`}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {alertas.map((a) => (
          <Card
            key={a.id}
            className={`flex flex-wrap items-start justify-between gap-3 rounded-3xl border p-5 shadow-[var(--shadow-card)] ${
              a.nivel === "alto"
                ? "border-destructive/40"
                : a.nivel === "medio"
                  ? "border-chart-4/50"
                  : "border-border/60"
            }`}
          >
            <div className="flex min-w-0 gap-3">
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  a.nivel === "alto"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-chart-4/20 text-foreground"
                }`}
              >
                {a.icone}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{a.titulo}</p>
                <p className="text-sm text-muted-foreground">{a.detalhe}</p>
              </div>
            </div>
            {a.acaoUrl && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to={a.acaoUrl}>{a.acaoLabel}</Link>
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
