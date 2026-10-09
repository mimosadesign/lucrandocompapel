export type Duracao = "1m" | "3m" | "lifetime";

export const DIAS_PLANO: Record<Exclude<Duracao, "lifetime">, number> = { "1m": 30, "3m": 90 };

/** Nova data de expiração: renovação antes do vencimento soma aos dias que ainda restam. */
export function novaExpiracao(
  duracao: Duracao,
  expiraAtual: string | null | undefined,
  agora: Date = new Date(),
): string | null {
  if (duracao === "lifetime") return null;
  const atual = expiraAtual ? new Date(expiraAtual).getTime() : 0;
  const base = Math.max(atual, agora.getTime());
  return new Date(base + DIAS_PLANO[duracao] * 86400000).toISOString();
}

/** Plano pago está ativo? Vitalício sempre; mensal/trimestral só até a data de vencimento. */
export function planoAtivo(
  duracao: string | null | undefined,
  expiraEm: string | null | undefined,
  agora: number = Date.now(),
): boolean {
  if ((duracao ?? "lifetime") === "lifetime") return true;
  const exp = expiraEm ? new Date(expiraEm).getTime() : 0;
  return exp > agora;
}
