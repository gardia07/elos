/**
 * "Hoje" calculado no fuso de Brasília (não no fuso do servidor) — o servidor roda em UTC,
 * então perto da meia-noite UTC (21h–23h59 em Brasília) `new Date().getUTCDate()` já teria
 * avançado para o dia seguinte, fazendo lembretes "no dia" serem descartados por engano.
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
