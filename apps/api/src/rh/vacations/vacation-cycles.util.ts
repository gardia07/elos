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

/** Encontra o ciclo aquisitivo ao qual uma data de gozo/abono pertence (o ciclo vigente na data, ou o mais recente já encerrado). */
export function findCycleFor(
  cycles: AquisitivoCycle[],
  data: Date,
): AquisitivoCycle | null {
  for (let i = cycles.length - 1; i >= 0; i -= 1) {
    if (data >= cycles[i].inicio) return cycles[i];
  }
  return cycles[0] ?? null;
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
 * concluído credita 30 dias novos, descontados os dias gozados/vendidos (abono) registrados
 * dentro daquele ciclo. Substitui Employee.feriasSaldo/feriasVencimento, que são gravados uma
 * única vez na admissão e nunca avançam para os ciclos seguintes.
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
    const usados = aprovadas
      .filter((v) => v.inicio >= cycle.inicio && v.inicio < cycle.fim)
      .reduce(
        (soma, v) => soma + inclusiveDays(v.inicio, v.fim) + v.diasAbono,
        0,
      );
    const restante = Math.max(0, 30 - usados);
    saldoDisponivel += restante;
    if (restante > 0 && !vencimento) vencimento = addMonths(cycle.fim, 12);
  }

  return {
    saldoDisponivel,
    vencimento: vencimento ?? addMonths(dataAdmissao, 12),
  };
}
