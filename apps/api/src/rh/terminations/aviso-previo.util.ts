import {
  anosCompletos,
  diasAvisoPrevio,
} from '../../dp/simulacoes/constantes-trabalhistas';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Início do aviso: o dia seguinte à comunicação (data do desligamento), quando o processo não
 * informou uma data específica. Fim: início + (dias de aviso - 1), contagem inclusiva — ex. início
 * 18/07 com 30 dias de aviso termina em 16/08.
 */
export function calcularAvisoPrevio(
  dataAdmissao: Date,
  dataDesligamento: Date,
  avisoPrevioInicio: Date | null,
): { diasAviso: number; inicio: Date; fim: Date } {
  const diasAviso = diasAvisoPrevio(
    anosCompletos(dataAdmissao, dataDesligamento),
  );
  const inicio = avisoPrevioInicio ?? addDays(dataDesligamento, 1);
  const fim = addDays(inicio, diasAviso - 1);
  return { diasAviso, inicio, fim };
}

/** Prazo de pagamento das verbas rescisórias: até o 10º dia corrido contado do desligamento (art. 477, §6º da CLT). */
export function calcularDataPagamento(dataDesligamento: Date): Date {
  return addDays(dataDesligamento, 10);
}
