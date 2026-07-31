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
