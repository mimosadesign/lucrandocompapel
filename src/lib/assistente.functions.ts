import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planoAtivo } from "@/lib/plano";

export type ResumoNegocio = {
  faturamentoMes: number;
  faturamentoMesAnterior: number;
  pedidosMes: number;
  ticketMedio: number;
  margemMedia: number;
  valorHora: number;
  meta: number;
  aReceber: number;
  topProdutos: Array<{ nome: string; margem: number }>;
  materiaisEmFalta: string[];
};

export type MensagemIA = { role: "user" | "assistant"; content: string };

const SYSTEM = `Você é a consultora financeira do app "Lucrando com Papel", feito para donas de ateliês de papelaria personalizada no Brasil.
Responda SEMPRE em português do Brasil, com linguagem simples, acolhedora e direta — nada de jargão contábil.
Use os números reais do negócio que estão no resumo para embasar cada resposta.
Dê respostas curtas (até 6 linhas), com no máximo 3 recomendações práticas e valores em reais quando fizer sentido.
Se faltar dado no resumo, diga com clareza o que a usuária precisa cadastrar no app para você conseguir responder.
Nunca invente números que não estejam no resumo.`;

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const texto = (v: unknown, max = 60) => String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, max);

export const perguntarConsultora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { pergunta: string; resumo: ResumoNegocio; historico?: MensagemIA[] }) => {
      const pergunta = (data?.pergunta ?? "").toString().trim().slice(0, 800);
      if (!pergunta) throw new Error("Escreva sua dúvida.");
      const r = (data?.resumo ?? {}) as Partial<ResumoNegocio>;
      const resumo: ResumoNegocio = {
        faturamentoMes: num(r.faturamentoMes),
        faturamentoMesAnterior: num(r.faturamentoMesAnterior),
        pedidosMes: num(r.pedidosMes),
        ticketMedio: num(r.ticketMedio),
        margemMedia: num(r.margemMedia),
        valorHora: num(r.valorHora),
        meta: num(r.meta),
        aReceber: num(r.aReceber),
        topProdutos: (Array.isArray(r.topProdutos) ? r.topProdutos : [])
          .slice(0, 5)
          .map((p) => ({ nome: texto(p?.nome), margem: num(p?.margem) })),
        materiaisEmFalta: (Array.isArray(r.materiaisEmFalta) ? r.materiaisEmFalta : [])
          .slice(0, 10)
          .map((m) => texto(m)),
      };
      // Só aceita conversa da usuária e da consultora — nunca instruções de sistema.
      const historico = (Array.isArray(data?.historico) ? data.historico : [])
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .slice(-8)
        .map((m) => ({ role: m.role, content: String(m.content ?? "").slice(0, 1500) }));
      return { pergunta, resumo, historico };
    },
  )
  .handler(async ({ data, context }) => {
    // Assistente é exclusivo do Diamante: confere o plano no servidor.
    const { userId, supabase } = context;
    const [{ data: sub }, { data: plano }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status,current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .maybeSingle(),
      supabase.from("lifetime_emails").select("duration,expires_at").maybeSingle(),
    ]);
    const assinaturaOk =
      !!sub && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    const planoOk = !!plano && planoAtivo(plano.duration, plano.expires_at);
    if (!assinaturaOk && !planoOk) {
      throw new Error("O assistente financeiro é exclusivo do plano Diamante.");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistente indisponível no momento.");

    const resumo = data.resumo;
    const contexto = [
      `Faturamento deste mês: R$ ${resumo.faturamentoMes.toFixed(2)}`,
      `Faturamento do mês anterior: R$ ${resumo.faturamentoMesAnterior.toFixed(2)}`,
      `Pedidos no mês: ${resumo.pedidosMes}`,
      `Ticket médio: R$ ${resumo.ticketMedio.toFixed(2)}`,
      `Margem média dos produtos: ${resumo.margemMedia.toFixed(1)}%`,
      `Valor da hora de trabalho: R$ ${resumo.valorHora.toFixed(2)}`,
      `Meta mensal: R$ ${resumo.meta.toFixed(2)}`,
      `Valor a receber (pedidos ainda não entregues): R$ ${resumo.aReceber.toFixed(2)}`,
      `Produtos com melhor margem: ${
        resumo.topProdutos.map((p) => `${p.nome} (${p.margem.toFixed(0)}%)`).join(", ") ||
        "nenhum cadastrado"
      }`,
      `Materiais abaixo do estoque mínimo: ${
        resumo.materiaisEmFalta.join(", ") || "nenhum"
      }`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `Resumo atual do negócio:\n${contexto}` },
          ...data.historico,
          { role: "user", content: data.pergunta },
        ],
      }),
    });

    if (res.status === 429) {
      throw new Error("Muitas perguntas seguidas. Espere alguns segundos e tente de novo.");
    }
    if (res.status === 402) {
      throw new Error("Os créditos de IA acabaram. Recarregue para continuar usando.");
    }
    if (!res.ok) {
      throw new Error("Não consegui responder agora. Tente novamente em instantes.");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const resposta = json.choices?.[0]?.message?.content?.trim();
    return { resposta: resposta || "Não consegui gerar uma resposta agora." };
  });
