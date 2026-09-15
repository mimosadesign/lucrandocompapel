/**
 * Camada central de custos do "Lucrando com Papel".
 *
 * Reaproveita as estruturas que já existem no app (materiais, gastos fixos da
 * tela Precificação e Custos, valor da hora) e acrescenta apenas o que faltava:
 * embalagens, máquinas, ferramentas, custos indiretos extras, rateio e
 * desperdício. Todos os dados usam o mesmo armazenamento sincronizado
 * (`useLocalState`), então não é preciso criar tabelas novas.
 */

// ===================== Unidades =====================

export const UNIDADES = [
  { value: "un", label: "unidade" },
  { value: "folha", label: "folha" },
  { value: "m", label: "metro" },
  { value: "cm", label: "centímetro" },
  { value: "g", label: "grama" },
  { value: "kg", label: "quilograma" },
  { value: "ml", label: "mililitro" },
  { value: "l", label: "litro" },
  { value: "pacote", label: "pacote" },
  { value: "caixa", label: "caixa" },
  { value: "rolo", label: "rolo" },
] as const;

export function labelUnidade(v?: string) {
  return UNIDADES.find((u) => u.value === v)?.label ?? (v || "unidade");
}

// ===================== Tipos =====================

/** Material/insumo ou embalagem — mesma estrutura já usada na tela Materiais. */
export type MaterialCusto = {
  id: string;
  nome: string;
  fornecedor: string;
  valorPago: number;
  quantidade: number;
  estoque: number;
  estoqueMinimo: number;
  gramatura?: string;
  tamanho?: string;
  /** unidade de compra (g, ml, folha, un...) */
  unidade?: string;
  /** "material" (padrão) ou "embalagem" */
  categoria?: "material" | "embalagem";
  observacao?: string;
};

export type Maquina = {
  id: string;
  nome: string;
  tipo: string;
  valorAquisicao: number;
  valorResidual: number;
  dataAquisicao?: string;
  /** "meses" ou "horas" */
  vidaUnidade: "meses" | "horas";
  vidaUtil: number;
  /** horas de uso por mês (necessário quando a vida útil é em meses) */
  horasMes: number;
  manutencaoMensal: number;
  observacao?: string;
  ativo: boolean;
};

export type Ferramenta = {
  id: string;
  nome: string;
  valorCompra: number;
  dataCompra?: string;
  /** "pecas" = vida útil em peças produzidas · "meses" = vida útil em meses */
  modo: "pecas" | "meses";
  vidaUtil: number;
  observacao?: string;
  ativo: boolean;
};

export type Periodicidade = "mensal" | "semanal" | "anual";

export type CustoIndireto = {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  periodicidade: Periodicidade;
  inicio?: string;
  observacao?: string;
  ativo: boolean;
};

export type RateioCfg = {
  /** "produtos" = divide pela produção estimada · "horas" = por hora produtiva */
  metodo: "produtos" | "horas";
  produtosMes: number;
  horasMes: number;
};

export type DesperdicioCfg = {
  /** percentual geral aplicado a materiais e embalagens */
  percentual: number;
  /** percentual específico por material (sobrepõe o geral) */
  porMaterial: Record<string, number>;
};

// ===================== Chaves de armazenamento =====================

export const K_MATERIAIS = "lcp:materiais";
export const K_MAQUINAS = "lcp:custos:maquinas";
export const K_FERRAMENTAS = "lcp:custos:ferramentas";
export const K_INDIRETOS = "lcp:custos:indiretos";
export const K_RATEIO = "lcp:custos:rateio";
export const K_DESPERDICIO = "lcp:custos:desperdicio";

export const RATEIO_PADRAO: RateioCfg = {
  metodo: "produtos",
  produtosMes: 0,
  horasMes: 0,
};

export const DESPERDICIO_PADRAO: DesperdicioCfg = {
  percentual: 0,
  porMaterial: {},
};

export const CATEGORIAS_INDIRETO = [
  "Estrutura",
  "Contas de consumo",
  "Software e assinaturas",
  "Transporte",
  "Limpeza",
  "Taxas bancárias",
  "Outros",
];

// ===================== Helpers de cálculo =====================

/** Resultado que pode não ser calculável — nunca devolve 0 silenciosamente. */
export type Calc = { valor: number | null; motivo?: string };

const ok = (valor: number): Calc => ({ valor });
const nao = (motivo: string): Calc => ({ valor: null, motivo });

export function valorOuZero(c: Calc) {
  return c.valor ?? 0;
}

/** Custo de 1 unidade do material (valor pago ÷ quantidade comprada). */
export function custoUnitario(m: Pick<MaterialCusto, "valorPago" | "quantidade">): Calc {
  if (!(m.valorPago > 0)) return nao("Material sem valor pago informado.");
  if (!(m.quantidade > 0)) return nao("Informe a quantidade comprada (maior que zero).");
  return ok(m.valorPago / m.quantidade);
}

/** Depreciação da máquina por hora de uso. */
export function depreciacaoHora(m: Maquina): Calc {
  const base = (m.valorAquisicao || 0) - (m.valorResidual || 0);
  if (!(m.valorAquisicao > 0)) return nao("Informe o valor de aquisição da máquina.");
  if (base <= 0) return nao("O valor residual não pode ser igual ou maior que o valor de compra.");
  if (!(m.vidaUtil > 0)) return nao("Informe a vida útil da máquina (maior que zero).");

  if (m.vidaUnidade === "horas") {
    const porHora = base / m.vidaUtil;
    const manut =
      m.manutencaoMensal > 0 && m.horasMes > 0 ? m.manutencaoMensal / m.horasMes : 0;
    return ok(porHora + manut);
  }
  if (!(m.horasMes > 0))
    return nao("Informe quantas horas por mês você usa essa máquina.");
  const mensal = base / m.vidaUtil + (m.manutencaoMensal || 0);
  return ok(mensal / m.horasMes);
}

/** Custo de desgaste da ferramenta por peça produzida. */
export function desgasteFerramentaPorPeca(f: Ferramenta, produtosMes: number): Calc {
  if (!(f.valorCompra > 0)) return nao("Informe o valor de compra da ferramenta.");
  if (!(f.vidaUtil > 0)) return nao("Informe a vida útil estimada da ferramenta.");
  if (f.modo === "pecas") return ok(f.valorCompra / f.vidaUtil);
  if (!(produtosMes > 0))
    return nao(
      "Informe a produção estimada por mês (no rateio) para dividir o desgaste desta ferramenta.",
    );
  return ok(f.valorCompra / f.vidaUtil / produtosMes);
}

/** Converte qualquer periodicidade para valor mensal equivalente. */
export function valorMensal(c: Pick<CustoIndireto, "valor" | "periodicidade">) {
  const v = c.valor || 0;
  if (c.periodicidade === "anual") return v / 12;
  if (c.periodicidade === "semanal") return (v * 52) / 12;
  return v;
}

export function totalIndiretosMensal(
  extras: CustoIndireto[],
  gastosFixos: number,
) {
  return (
    gastosFixos +
    extras.filter((c) => c.ativo !== false).reduce((s, c) => s + valorMensal(c), 0)
  );
}

/** Custo indireto atribuído a um item, respeitando o método de rateio escolhido. */
export function rateioPorItem(
  totalMensal: number,
  cfg: RateioCfg,
  minutosDoItem: number,
): Calc {
  if (totalMensal <= 0) return ok(0);
  if (cfg.metodo === "horas") {
    if (!(cfg.horasMes > 0))
      return nao("Informe quantas horas produtivas você tem por mês para ratear os custos indiretos.");
    const porHora = totalMensal / cfg.horasMes;
    if (!(minutosDoItem > 0))
      return nao("Informe o tempo de produção do item para ratear os custos indiretos por hora.");
    return ok((porHora / 60) * minutosDoItem);
  }
  if (!(cfg.produtosMes > 0))
    return nao("Informe a produção estimada por mês para ratear os custos indiretos.");
  return ok(totalMensal / cfg.produtosMes);
}

/** Percentual de desperdício aplicável a um material (específico > geral). */
export function percentualDesperdicio(cfg: DesperdicioCfg, materialId: string) {
  const esp = cfg.porMaterial?.[materialId];
  if (typeof esp === "number" && !isNaN(esp)) return esp;
  return cfg.percentual || 0;
}

// ===================== Composição do custo do item =====================

export type LinhaComposicao = {
  grupo: "Materiais" | "Embalagem" | "Máquinas" | "Ferramentas" | "Custos indiretos" | "Desperdício" | "Mão de obra";
  nome: string;
  valor: number;
  /** explicação matemática para o "Ver detalhes do custo" */
  detalhe: string;
  aviso?: string;
};

export type UsoMaterial = { id: string; materialId: string; quantidade: number };
export type UsoMaquina = { id: string; maquinaId: string; minutos: number };
export type UsoFerramenta = { id: string; ferramentaId: string };

export type EntradaComposicao = {
  minutos: number;
  valorHora: number;
  materiais: UsoMaterial[];
  embalagens: UsoMaterial[];
  maquinas: UsoMaquina[];
  ferramentas: UsoFerramenta[];
  catalogoMateriais: MaterialCusto[];
  catalogoMaquinas: Maquina[];
  catalogoFerramentas: Ferramenta[];
  indiretosMensal: number;
  rateio: RateioCfg;
  desperdicio: DesperdicioCfg;
};

const n2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const n4 = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

export type Composicao = {
  linhas: LinhaComposicao[];
  avisos: string[];
  totalMateriais: number;
  totalEmbalagens: number;
  totalMaquinas: number;
  totalFerramentas: number;
  totalIndireto: number;
  totalDesperdicio: number;
  totalMaoDeObra: number;
  /** soma sem desperdício (materiais + embalagens) */
  baseDesperdicio: number;
  total: number;
};

export function montarComposicao(e: EntradaComposicao): Composicao {
  const linhas: LinhaComposicao[] = [];
  const avisos: string[] = [];

  const somaConsumo = (
    usos: UsoMaterial[],
    grupo: "Materiais" | "Embalagem",
  ) => {
    let total = 0;
    for (const u of usos) {
      const m = e.catalogoMateriais.find((x) => x.id === u.materialId);
      if (!m) continue;
      const unit = custoUnitario(m);
      if (unit.valor === null) {
        avisos.push(`${m.nome}: ${unit.motivo}`);
        linhas.push({
          grupo,
          nome: m.nome,
          valor: 0,
          detalhe: "Sem custo configurado.",
          aviso: unit.motivo,
        });
        continue;
      }
      if (!(u.quantidade > 0)) {
        avisos.push(`${m.nome}: informe a quantidade utilizada no produto.`);
        linhas.push({
          grupo,
          nome: m.nome,
          valor: 0,
          detalhe: "Quantidade utilizada não informada.",
          aviso: "Quantidade utilizada precisa ser maior que zero.",
        });
        continue;
      }
      const valor = unit.valor * u.quantidade;
      total += valor;
      const un = labelUnidade(m.unidade);
      linhas.push({
        grupo,
        nome: m.nome,
        valor,
        detalhe: `${m.quantidade} ${un}(s) por ${n2(m.valorPago)} → ${n4(unit.valor)} por ${un} · uso de ${u.quantidade} ${un}(s) = ${n2(valor)}`,
      });
    }
    return total;
  };

  const totalMateriais = somaConsumo(e.materiais, "Materiais");
  const totalEmbalagens = somaConsumo(e.embalagens, "Embalagem");

  // Máquinas
  let totalMaquinas = 0;
  for (const u of e.maquinas) {
    const mq = e.catalogoMaquinas.find((x) => x.id === u.maquinaId);
    if (!mq) continue;
    const dep = depreciacaoHora(mq);
    if (dep.valor === null) {
      avisos.push(`${mq.nome}: ${dep.motivo}`);
      linhas.push({
        grupo: "Máquinas",
        nome: mq.nome,
        valor: 0,
        detalhe: "Dados insuficientes para calcular a depreciação.",
        aviso: dep.motivo,
      });
      continue;
    }
    const valor = (dep.valor / 60) * (u.minutos || 0);
    totalMaquinas += valor;
    const vida =
      mq.vidaUnidade === "horas"
        ? `${mq.vidaUtil} horas de uso`
        : `${mq.vidaUtil} meses · ${mq.horasMes} h/mês`;
    linhas.push({
      grupo: "Máquinas",
      nome: mq.nome,
      valor,
      detalhe: `Valor ${n2(mq.valorAquisicao)}${mq.valorResidual > 0 ? ` (residual ${n2(mq.valorResidual)})` : ""} · vida útil ${vida} → ${n4(dep.valor)} por hora · uso de ${u.minutos} min = ${n2(valor)}`,
    });
  }

  // Ferramentas
  let totalFerramentas = 0;
  for (const u of e.ferramentas) {
    const f = e.catalogoFerramentas.find((x) => x.id === u.ferramentaId);
    if (!f) continue;
    const d = desgasteFerramentaPorPeca(f, e.rateio.produtosMes);
    if (d.valor === null) {
      avisos.push(`${f.nome}: ${d.motivo}`);
      linhas.push({
        grupo: "Ferramentas",
        nome: f.nome,
        valor: 0,
        detalhe: "Dados insuficientes para calcular o desgaste.",
        aviso: d.motivo,
      });
      continue;
    }
    totalFerramentas += d.valor;
    linhas.push({
      grupo: "Ferramentas",
      nome: f.nome,
      valor: d.valor,
      detalhe:
        f.modo === "pecas"
          ? `${n2(f.valorCompra)} ÷ ${f.vidaUtil} peças = ${n4(d.valor)} por peça`
          : `${n2(f.valorCompra)} ÷ ${f.vidaUtil} meses ÷ ${e.rateio.produtosMes} peças/mês = ${n4(d.valor)} por peça`,
    });
  }

  // Custos indiretos
  const rat = rateioPorItem(e.indiretosMensal, e.rateio, e.minutos);
  let totalIndireto = 0;
  if (rat.valor === null) {
    avisos.push(rat.motivo!);
    linhas.push({
      grupo: "Custos indiretos",
      nome: "Rateio",
      valor: 0,
      detalhe: "Rateio não configurado.",
      aviso: rat.motivo,
    });
  } else {
    totalIndireto = rat.valor;
    linhas.push({
      grupo: "Custos indiretos",
      nome: "Rateio",
      valor: totalIndireto,
      detalhe:
        e.rateio.metodo === "horas"
          ? `${n2(e.indiretosMensal)}/mês ÷ ${e.rateio.horasMes} h produtivas = ${n4(e.indiretosMensal / (e.rateio.horasMes || 1))} por hora · ${e.minutos} min = ${n2(totalIndireto)}`
          : `${n2(e.indiretosMensal)}/mês ÷ ${e.rateio.produtosMes} produtos = ${n2(totalIndireto)} por produto`,
    });
  }

  // Desperdício (só sobre materiais e embalagens, uma única vez)
  const baseDesperdicio = totalMateriais + totalEmbalagens;
  let totalDesperdicio = 0;
  for (const u of [...e.materiais, ...e.embalagens]) {
    const m = e.catalogoMateriais.find((x) => x.id === u.materialId);
    if (!m) continue;
    const unit = custoUnitario(m);
    if (unit.valor === null || !(u.quantidade > 0)) continue;
    const pct = percentualDesperdicio(e.desperdicio, m.id);
    if (pct <= 0) continue;
    totalDesperdicio += unit.valor * u.quantidade * (pct / 100);
  }
  if (totalDesperdicio > 0) {
    linhas.push({
      grupo: "Desperdício",
      nome: "Perdas de produção",
      valor: totalDesperdicio,
      detalhe: `${n2(baseDesperdicio)} em materiais e embalagens + percentual de desperdício = ${n2(totalDesperdicio)}`,
    });
  }

  // Mão de obra
  let totalMaoDeObra = 0;
  if (!(e.valorHora > 0)) {
    avisos.push("Valor da hora de trabalho não configurado em Precificação e Custos.");
  } else if (!(e.minutos > 0)) {
    avisos.push("Informe o tempo de produção do item para calcular a mão de obra.");
  } else {
    totalMaoDeObra = (e.valorHora / 60) * e.minutos;
  }
  linhas.push({
    grupo: "Mão de obra",
    nome: "Produção",
    valor: totalMaoDeObra,
    detalhe: `${n2(e.valorHora)} por hora × ${e.minutos} min = ${n2(totalMaoDeObra)}`,
    ...(totalMaoDeObra === 0
      ? { aviso: "Sem valor da hora ou sem tempo de produção informado." }
      : {}),
  });

  const total =
    totalMateriais +
    totalEmbalagens +
    totalMaquinas +
    totalFerramentas +
    totalIndireto +
    totalDesperdicio +
    totalMaoDeObra;

  return {
    linhas,
    avisos,
    totalMateriais,
    totalEmbalagens,
    totalMaquinas,
    totalFerramentas,
    totalIndireto,
    totalDesperdicio,
    totalMaoDeObra,
    baseDesperdicio,
    total,
  };
}
