import { monthKey } from "@/lib/storage";

export type Conta = {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  /** dia do vencimento (1-31) quando a conta é mensal */
  dia: number;
  /** data completa (YYYY-MM-DD) quando é conta avulsa */
  vencimento?: string;
  recorrente: boolean;
  /** meses (YYYY-MM) já quitados */
  pagos: string[];
  observacao?: string;
};

export const CONTAS_KEY = "lcp:contas";

export const CATEGORIAS_CONTA = [
  "Fixa da casa",
  "Ateliê",
  "Fornecedor",
  "Imposto",
  "Empréstimo",
  "Marketing",
  "Outros",
];

export function contaPaga(c: Conta, mes = monthKey()) {
  if (!c.recorrente && c.vencimento) {
    return (c.pagos || []).length > 0;
  }
  return (c.pagos || []).includes(mes);
}

/** Data de vencimento da conta dentro do mês de referência. */
export function vencimentoNoMes(c: Conta, ref = new Date()): Date | null {
  if (!c.recorrente) {
    if (!c.vencimento) return null;
    const d = new Date(`${c.vencimento}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const dia = Math.min(Math.max(1, c.dia || 1), ultimoDia);
  return new Date(ref.getFullYear(), ref.getMonth(), dia, 12, 0, 0);
}

/** Contas que pertencem ao mês de referência (recorrentes + avulsas do mês). */
export function contasDoMes(contas: Conta[], ref = new Date()) {
  return contas.filter((c) => {
    const v = vencimentoNoMes(c, ref);
    if (!v) return false;
    return v.getMonth() === ref.getMonth() && v.getFullYear() === ref.getFullYear();
  });
}

export function totalContasDoMes(contas: Conta[], ref = new Date()) {
  return contasDoMes(contas, ref).reduce((s, c) => s + (c.valor || 0), 0);
}

export function totalAPagar(contas: Conta[], ref = new Date()) {
  const mes = monthKey(ref);
  return contasDoMes(contas, ref)
    .filter((c) => !contaPaga(c, mes))
    .reduce((s, c) => s + (c.valor || 0), 0);
}
