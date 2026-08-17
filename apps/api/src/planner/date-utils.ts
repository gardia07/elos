/**
 * "Hoje" calculado no fuso de Brasília (não no fuso do servidor) — mesma
 * lógica usada em agenda/date-utils.ts, necessária pra sequências de hábito
 * não quebrarem por engano perto da meia-noite UTC.
 */
export function hojeBrasiliaUtc(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

export function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
