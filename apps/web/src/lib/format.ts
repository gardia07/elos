/**
 * Formats a date-only value ("YYYY-MM-DD", or an ISO datetime at UTC
 * midnight as Prisma/JSON serializes `@db.Date` columns) as dd/mm/yyyy.
 *
 * `new Date(v).toLocaleDateString('pt-BR')` looks right but shifts the date
 * back a day for anyone in a timezone behind UTC (all of Brazil) — the
 * value has no time-of-day meaning, so it must be read back in UTC instead
 * of the browser's local timezone.
 */
/** 100% = verde, 50–99% = amarelo, abaixo de 50% = vermelho. */
export function complianceTone(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 100) return 'green';
  if (pct >= 50) return 'amber';
  return 'red';
}

/** Status exibido do colaborador -- Afastado tem prioridade visual sobre Ativo (mesmo status ATIVO por trás). */
export function statusColaboradorLabel(status: 'ATIVO' | 'INATIVO', afastadoAtual: boolean): string {
  if (status === 'ATIVO' && afastadoAtual) return 'Afastado';
  return status === 'ATIVO' ? 'Ativo' : 'Inativo';
}

export function statusColaboradorTone(status: 'ATIVO' | 'INATIVO', afastadoAtual: boolean): 'green' | 'amber' | 'grey' {
  if (status === 'ATIVO' && afastadoAtual) return 'amber';
  return status === 'ATIVO' ? 'green' : 'grey';
}

export function formatDate(v: string): string {
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Formats digits as a Brazilian phone number while typing: (11) 91234-5678 / (11) 1234-5678. */
export function maskPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formats digits as a CPF while typing: 123.456.789-01. */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Formats digits as a CNPJ while typing: 12.345.678/0001-90. */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Formats digits as a CEP while typing: 12345-678. */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export type TerminationTipo =
  | 'SEM_JUSTA_CAUSA'
  | 'PEDIDO_DEMISSAO'
  | 'ACORDO'
  | 'JUSTA_CAUSA'
  | 'ACORDO_MUTUO'
  | 'FIM_CONTRATO_EXPERIENCIA'
  | 'APOSENTADORIA'
  | 'RESCISAO_INDIRETA'
  | 'OBITO';

export const TERMINATION_TIPO_LABEL: Record<TerminationTipo, string> = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
  JUSTA_CAUSA: 'Justa causa',
  ACORDO_MUTUO: 'Acordo mútuo (art. 484-A)',
  FIM_CONTRATO_EXPERIENCIA: 'Fim de contrato de experiência',
  APOSENTADORIA: 'Aposentadoria',
  RESCISAO_INDIRETA: 'Rescisão indireta',
  OBITO: 'Óbito',
};

export type TerminationStatusValue =
  | 'RASCUNHO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_EXAME'
  | 'PRONTO_PARA_EFETIVAR'
  | 'EFETIVADO'
  | 'EM_HOMOLOGACAO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export const TERMINATION_STATUS_LABEL: Record<TerminationStatusValue, string> = {
  RASCUNHO: 'Rascunho',
  EM_ANDAMENTO: 'Em checklist',
  AGUARDANDO_EXAME: 'Aguardando exame',
  PRONTO_PARA_EFETIVAR: 'Pronto para efetivar',
  EFETIVADO: 'Efetivado',
  EM_HOMOLOGACAO: 'Em homologação',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const TERMINATION_STATUS_TONE: Record<TerminationStatusValue, 'green' | 'blue' | 'amber' | 'red' | 'grey'> = {
  RASCUNHO: 'grey',
  EM_ANDAMENTO: 'amber',
  AGUARDANDO_EXAME: 'amber',
  PRONTO_PARA_EFETIVAR: 'blue',
  EFETIVADO: 'blue',
  EM_HOMOLOGACAO: 'amber',
  CONCLUIDO: 'green',
  CANCELADO: 'red',
};
