/** Substitui tokens {{chave}} (ou {{grupo.chave}}) pelo valor correspondente em `vars`; token sem valor vira string vazia. */
export function renderTemplate(
  corpo: string,
  vars: Record<string, string>,
): string {
  return corpo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) =>
    key in vars ? vars[key] : '',
  );
}

export function formatBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
