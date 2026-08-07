import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { DiamondLock } from "@/components/diamond-lock";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocalState, brl } from "@/lib/storage";
import {
  perguntarConsultora,
  type MensagemIA,
  type ResumoNegocio,
} from "@/lib/assistente.functions";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA do Ateliê — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Tire dúvidas sobre o seu negócio com uma consultora de IA que lê seus números de faturamento, margem e pedidos.",
      },
      { property: "og:title", content: "Assistente IA do Ateliê" },
      {
        property: "og:description",
        content: "Pergunte sobre lucro, preço e metas e receba respostas com os seus números.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistentePage,
});

type Pedido = {
  id: string;
  valor: number;
  valorEntrega?: number;
  status: string;
  entrega?: string;
};
type Produto = { id: string; nome: string; custo: number; margemPct: number };
type Material = { id: string; nome: string; estoque?: number; estoqueMinimo?: number };

const SUGESTOES = [
  "Como está a saúde do meu negócio esse mês?",
  "Estou cobrando barato demais?",
  "O que faço para bater minha meta?",
  "Qual produto me dá mais lucro?",
];

function AssistentePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Assistente IA do Ateliê"
        diamond
        description="Uma consultora que lê os seus números e responde suas dúvidas sobre lucro, preço e metas."
      />
      <DiamondLock
        title="Sua consultora financeira 24h"
        description="Pergunte em português mesmo: 'estou cobrando barato?', 'como bater minha meta?'. Ela responde usando os números reais do seu ateliê."
        preview={<Chat />}
      />
    </div>
  );
}

function Chat() {
  const [pedidos] = useLocalState<Pedido[]>("lcp:pedidos", []);
  const [produtos] = useLocalState<Produto[]>("lcp:produtos", []);
  const [materiais] = useLocalState<Material[]>("lcp:materiais", []);
  const [meta] = useLocalState<number>("lcp:meta", 0);
  const [valorHora] = useLocalState<number>("lcp:valorHora", 0);
  const [mensagens, setMensagens] = useLocalState<MensagemIA[]>("lcp:ia:chat", []);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const perguntar = useServerFn(perguntarConsultora);

  const resumo: ResumoNegocio = useMemo(() => {
    const now = new Date();
    const total = (p: Pedido) => (p.valor || 0) + (p.valorEntrega || 0);
    const noMes = (p: Pedido, offset: number) => {
      if (!p.entrega) return false;
      const d = new Date(p.entrega);
      if (isNaN(d.getTime())) return false;
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    };
    const validos = pedidos.filter((p) => p.status !== "Cancelado");
    const mes = validos.filter((p) => noMes(p, 0));
    const anterior = validos.filter((p) => noMes(p, 1));
    const faturamentoMes = mes.reduce((s, p) => s + total(p), 0);
    const margens = produtos.filter((p) => isFinite(p.margemPct));
    return {
      faturamentoMes,
      faturamentoMesAnterior: anterior.reduce((s, p) => s + total(p), 0),
      pedidosMes: mes.length,
      ticketMedio: mes.length ? faturamentoMes / mes.length : 0,
      margemMedia: margens.length
        ? margens.reduce((s, p) => s + p.margemPct, 0) / margens.length
        : 0,
      valorHora,
      meta,
      aReceber: validos
        .filter((p) => p.status !== "Entregue")
        .reduce((s, p) => s + total(p), 0),
      topProdutos: [...produtos]
        .sort((a, b) => b.margemPct - a.margemPct)
        .slice(0, 5)
        .map((p) => ({ nome: p.nome, margem: p.margemPct })),
      materiaisEmFalta: materiais
        .filter((m) => (m.estoqueMinimo ?? 0) > 0 && (m.estoque ?? 0) <= (m.estoqueMinimo ?? 0))
        .map((m) => m.nome)
        .slice(0, 10),
    };
  }, [pedidos, produtos, materiais, meta, valorHora]);

  async function enviar(texto: string) {
    const q = texto.trim();
    if (!q || carregando) return;
    const novas: MensagemIA[] = [...mensagens, { role: "user", content: q }];
    setMensagens(novas);
    setPergunta("");
    setCarregando(true);
    try {
      const r = await perguntar({
        data: { pergunta: q, resumo, historico: mensagens.slice(-8) },
      });
      setMensagens([...novas, { role: "assistant", content: r.resposta }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui responder agora.");
      setMensagens(novas);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-3 text-sm">
          <Resumo label="Faturamento do mês" valor={brl(resumo.faturamentoMes)} />
          <Resumo label="Ticket médio" valor={brl(resumo.ticketMedio)} />
          <Resumo label="Margem média" valor={`${resumo.margemMedia.toFixed(0)}%`} />
          <Resumo label="A receber" valor={brl(resumo.aReceber)} />
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)] space-y-4">
        <div className="min-h-[220px] space-y-3">
          {mensagens.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-primary" />
              <p className="text-sm text-muted-foreground">
                Pergunte qualquer coisa sobre o seu negócio. Ela responde com os seus números.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-foreground/20"
                    onClick={() => void enviar(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-3xl rounded-bl-lg bg-muted px-4 py-2.5 text-sm"
                }
              >
                {m.content}
              </div>
            ))
          )}
          {carregando ? (
            <div className="mr-auto flex items-center gap-2 rounded-3xl bg-muted px-4 py-2.5 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando seus números...
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void enviar(pergunta);
            }}
            placeholder="Ex.: estou cobrando barato nos convites?"
            className="h-11 rounded-full border-border/70 bg-background px-4"
          />
          <Button
            className="h-11 rounded-full gap-2"
            disabled={carregando}
            onClick={() => void enviar(pergunta)}
          >
            <Send className="h-4 w-4" /> Perguntar
          </Button>
        </div>

        {mensagens.length > 0 ? (
          <button
            type="button"
            onClick={() => setMensagens([])}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Limpar conversa
          </button>
        ) : null}
      </Card>
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-[130px] flex-1 rounded-2xl bg-background/70 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{valor}</p>
    </div>
  );
}
