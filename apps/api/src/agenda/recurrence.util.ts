export type DiaSemana = 'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';

const DIA_SEMANA_INDEX: Record<DiaSemana, number> = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 };

export type AgendaRecorrenciaFrequencia = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'PERSONALIZADA';

export interface RecorrenciaRule {
  frequencia: AgendaRecorrenciaFrequencia;
  intervalo: number;
  diasDaSemana: string[];
  posicaoNoMes: number | null;
  /** Meia-noite UTC (mesma convenção de startOfDayUtc em agenda.service.ts). */
  dataInicio: Date;
  dataFim: Date;
}

/** Trava de segurança contra regra mal configurada (ex.: diária sem fim próximo) gerar uma série gigante. */
const MAX_OCORRENCIAS = 366;

/**
 * Materializa as datas de ocorrência de uma regra de recorrência — toda a
 * aritmética em UTC (Date.UTC/getUTC*), nunca métodos locais, para não
 * depender do fuso do processo Node (mesma convenção de bucketFor/
 * startOfDayUtc em ferramentas/agenda-geral/agenda-geral.service.ts).
 */
export function computeOccurrences(rule: RecorrenciaRule): Date[] {
  switch (rule.frequencia) {
    case 'DIARIA':
      return diaria(rule);
    case 'SEMANAL':
      return semanal(rule);
    case 'MENSAL':
      return mensal(rule);
    case 'ANUAL':
      return anual(rule);
    case 'PERSONALIZADA':
      return personalizada(rule);
  }
}

function diaria({ intervalo, dataInicio, dataFim }: RecorrenciaRule): Date[] {
  const out: Date[] = [];
  let cursor = dataInicio;
  while (cursor.getTime() <= dataFim.getTime() && out.length < MAX_OCORRENCIAS) {
    out.push(cursor);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + intervalo));
  }
  return out;
}

function semanal({ intervalo, diasDaSemana, dataInicio, dataFim }: RecorrenciaRule): Date[] {
  const dias = (diasDaSemana.length > 0 ? diasDaSemana.map((d) => DIA_SEMANA_INDEX[d as DiaSemana]) : [dataInicio.getUTCDay()]).sort(
    (a, b) => a - b,
  );
  const out: Date[] = [];
  let semanaInicio = new Date(Date.UTC(dataInicio.getUTCFullYear(), dataInicio.getUTCMonth(), dataInicio.getUTCDate() - dataInicio.getUTCDay()));
  while (semanaInicio.getTime() <= dataFim.getTime() && out.length < MAX_OCORRENCIAS) {
    for (const dow of dias) {
      if (out.length >= MAX_OCORRENCIAS) break;
      const d = new Date(Date.UTC(semanaInicio.getUTCFullYear(), semanaInicio.getUTCMonth(), semanaInicio.getUTCDate() + dow));
      if (d.getTime() >= dataInicio.getTime() && d.getTime() <= dataFim.getTime()) out.push(d);
    }
    semanaInicio = new Date(Date.UTC(semanaInicio.getUTCFullYear(), semanaInicio.getUTCMonth(), semanaInicio.getUTCDate() + 7 * intervalo));
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

function mensal({ intervalo, dataInicio, dataFim }: RecorrenciaRule): Date[] {
  const out: Date[] = [];
  const diaAlvo = dataInicio.getUTCDate();
  for (let i = 0; out.length < MAX_OCORRENCIAS; i++) {
    const ano = dataInicio.getUTCFullYear();
    const mes = dataInicio.getUTCMonth() + i * intervalo;
    const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(ano, mes, Math.min(diaAlvo, ultimoDiaDoMes)));
    if (d.getTime() > dataFim.getTime()) break;
    out.push(d);
  }
  return out;
}

function anual({ intervalo, dataInicio, dataFim }: RecorrenciaRule): Date[] {
  const out: Date[] = [];
  for (let i = 0; out.length < MAX_OCORRENCIAS; i++) {
    const ano = dataInicio.getUTCFullYear() + i * intervalo;
    // Math.min protege 29/fev em anos não bissextos.
    const ultimoDiaDoMes = new Date(Date.UTC(ano, dataInicio.getUTCMonth() + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(ano, dataInicio.getUTCMonth(), Math.min(dataInicio.getUTCDate(), ultimoDiaDoMes)));
    if (d.getTime() > dataFim.getTime()) break;
    out.push(d);
  }
  return out;
}

/** posicao: 1..4 = 1ª..4ª ocorrência do dia da semana no mês; -1 = última. Retorna null se o mês não tiver essa ocorrência (ex.: 5ª terça). */
function nthWeekdayOfMonth(ano: number, mes: number, dow: number, posicao: number): Date | null {
  if (posicao === -1) {
    const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0));
    const diff = (ultimoDia.getUTCDay() - dow + 7) % 7;
    return new Date(Date.UTC(ano, mes, ultimoDia.getUTCDate() - diff));
  }
  const primeiroDia = new Date(Date.UTC(ano, mes, 1));
  const diff = (dow - primeiroDia.getUTCDay() + 7) % 7;
  const dia = 1 + diff + (posicao - 1) * 7;
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return dia > ultimoDiaDoMes ? null : new Date(Date.UTC(ano, mes, dia));
}

function personalizada({ diasDaSemana, posicaoNoMes, dataInicio, dataFim }: RecorrenciaRule): Date[] {
  const dow = DIA_SEMANA_INDEX[(diasDaSemana[0] ?? 'SEX') as DiaSemana];
  const posicao = posicaoNoMes ?? -1;
  const out: Date[] = [];
  let ano = dataInicio.getUTCFullYear();
  let mes = dataInicio.getUTCMonth();
  const anoLimite = dataFim.getUTCFullYear() + 1;
  while (out.length < MAX_OCORRENCIAS && ano <= anoLimite) {
    const d = nthWeekdayOfMonth(ano, mes, dow, posicao);
    if (d) {
      if (d.getTime() > dataFim.getTime()) break;
      if (d.getTime() >= dataInicio.getTime()) out.push(d);
    }
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return out;
}
