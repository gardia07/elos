function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export interface AquisitivoCycle {
  inicio: Date;
  fim: Date;
}

/** Ciclos de 12 meses do período aquisitivo de férias, da admissão até o ciclo corrente (inclusive). */
export function buildAquisitivoCycles(
  dataAdmissao: Date,
  hoje: Date,
): AquisitivoCycle[] {
  const cycles: AquisitivoCycle[] = [];
  let inicio = dataAdmissao;
  let fim = addMonths(dataAdmissao, 12);
  while (inicio <= hoje) {
    cycles.push({ inicio, fim });
    inicio = fim;
    fim = addMonths(inicio, 12);
  }
  return cycles;
}

/**
 * Encontra o ciclo aquisitivo a que um dia de gozo/abono pertence — não pelo período em que foi
 * ganho, mas pelo período concessivo em que a lei exige que seja usado (os 12 meses seguintes ao
 * fim do ciclo). Como os ciclos são contíguos, o período concessivo do ciclo N é exatamente a
 * janela do ciclo N+1 — por isso comparamos contra `[cycle.fim, cycle.fim + 12 meses)`, não
 * contra a janela do próprio ciclo.
 */
export function findCycleForUso(
  cycles: AquisitivoCycle[],
  data: Date,
): AquisitivoCycle | null {
  for (const cycle of cycles) {
    const concessivoFim = addMonths(cycle.fim, 12);
    if (data >= cycle.fim && data < concessivoFim) return cycle;
  }
  return null;
}

export function inclusiveDays(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

export interface FeriasStatus {
  saldoDisponivel: number;
  vencimento: Date;
}

interface VacationUso {
  inicio: Date;
  fim: Date;
  diasAbono: number;
}

/**
 * Recalcula saldo e vencimento a partir dos ciclos aquisitivos reais — cada ciclo de 12 meses
 * concluído credita 30 dias novos, descontados os dias gozados/vendidos (abono) usados dentro do
 * respectivo período concessivo (os 12 meses seguintes ao fim do ciclo — ver findCycleForUso).
 * Substitui Employee.feriasSaldo/feriasVencimento, que são gravados uma única vez na admissão e
 * nunca avançam para os ciclos seguintes.
 */
export function computeFeriasStatus(
  dataAdmissao: Date,
  hoje: Date,
  aprovadas: VacationUso[],
): FeriasStatus {
  const cycles = buildAquisitivoCycles(dataAdmissao, hoje);
  let saldoDisponivel = 0;
  let vencimento: Date | null = null;

  for (const cycle of cycles) {
    if (cycle.fim > hoje) {
      if (!vencimento) vencimento = addMonths(cycle.fim, 12);
      continue;
    }
    const concessivoFim = addMonths(cycle.fim, 12);
    const usados = aprovadas
      .filter((v) => v.inicio >= cycle.fim && v.inicio < concessivoFim)
      .reduce(
        (soma, v) => soma + inclusiveDays(v.inicio, v.fim) + v.diasAbono,
        0,
      );
    const restante = Math.max(0, 30 - usados);
    saldoDisponivel += restante;
    if (restante > 0 && !vencimento) vencimento = concessivoFim;
  }

  return {
    saldoDisponivel,
    vencimento: vencimento ?? addMonths(dataAdmissao, 12),
  };
}
