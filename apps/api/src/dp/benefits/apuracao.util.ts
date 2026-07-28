/** competencia no formato "YYYY-MM". */
export function competenciaRange(competencia: string): { inicio: Date; fim: Date; ano: number; mes: number } {
  const [ano, mes] = competencia.split('-').map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0)); // último dia do mês
  return { inicio, fim, ano, mes };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

interface Periodo {
  inicio: Date;
  fim: Date | null;
}

function dentroDoPeriodo(dia: Date, periodo: Periodo): boolean {
  if (dia < periodo.inicio) return false;
  if (periodo.fim && dia > periodo.fim) return false;
  return true;
}

/**
 * Dias úteis do mês em que a adesão estava ativa, descontando feriados
 * cadastrados e dias de férias aprovadas / afastamento em aberto.
 */
export function diasUteisPagos(
  competencia: string,
  adesao: Periodo,
  feriados: Date[],
  ferias: Periodo[],
  afastamentos: Periodo[],
): { diasUteis: number; diasDescontados: number } {
  const { inicio, fim } = competenciaRange(competencia);
  const feriadosSet = new Set(feriados.map(toIsoDate));

  let diasUteis = 0;
  let diasDescontados = 0;

  for (let d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = new Date(d);
    if (!isWeekday(dia)) continue;
    if (feriadosSet.has(toIsoDate(dia))) continue;
    if (!dentroDoPeriodo(dia, adesao)) continue;

    const afastado = ferias.some((p) => dentroDoPeriodo(dia, p)) || afastamentos.some((p) => dentroDoPeriodo(dia, p));
    if (afastado) {
      diasDescontados++;
      continue;
    }
    diasUteis++;
  }

  return { diasUteis, diasDescontados };
}

/** Idade completa numa data de referência. */
export function idadeEm(dataNascimento: Date, referencia: Date): number {
  let idade = referencia.getUTCFullYear() - dataNascimento.getUTCFullYear();
  const aniversarioJaPassou =
    referencia.getUTCMonth() > dataNascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === dataNascimento.getUTCMonth() && referencia.getUTCDate() >= dataNascimento.getUTCDate());
  if (!aniversarioJaPassou) idade--;
  return idade;
}

export function splitCoparticipacao(
  valorTotal: number,
  regra: { percentualEmpresa: number } | null,
): { valorEmpresa: number; valorColaborador: number } {
  const pctEmpresa = regra ? regra.percentualEmpresa : 100;
  const valorEmpresa = Math.round(valorTotal * (pctEmpresa / 100) * 100) / 100;
  const valorColaborador = Math.round((valorTotal - valorEmpresa) * 100) / 100;
  return { valorEmpresa, valorColaborador };
}
