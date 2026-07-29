import { readSheet } from 'read-excel-file/node';
import { parse } from 'csv-parse/sync';

export type Cell = string | number | boolean | Date | null;
export type RubricaTipo = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO';
export type ColumnAlvo = 'IGNORAR' | 'MATRICULA' | 'CPF' | 'NOME' | 'RUBRICA';

export interface ColumnMapping {
  indice: number;
  alvo: ColumnAlvo;
  descricao?: string;
  codigo?: string;
  rubricaTipo?: RubricaTipo;
}

/** Lê .csv, .xls ou .xlsx a partir do buffer enviado, devolvendo linhas cruas (cabeçalho incluso). */
export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<Cell[][]> {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv') {
    const records = parse(buffer, {
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
    });
    return records;
  }
  const rows = await readSheet(buffer);
  return rows as Cell[][];
}

export function cellToString(cell: Cell): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

/** Aceita tanto formato BR (1.234,56) quanto US (1,234.56) além de números já nativos do xlsx. */
export function cellToNumber(cell: Cell): number {
  if (typeof cell === 'number') return cell;
  const raw = cellToString(cell);
  if (!raw) return 0;
  const normalized =
    raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  const n = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const RE_MATRICULA = /matr[ií]cula|registro\s*func/i;
const RE_CPF = /^cpf$/i;
const RE_NOME = /^nome/i;
const RE_DESCONTO = /desconto|inss|irrf|previd|imposto|adiantamento|falta/i;

/** Sugestão inicial de mapeamento por palavra-chave no cabeçalho — usuário confirma/ajusta antes do commit. */
export function sugerirMapeamento(headers: Cell[]): ColumnMapping[] {
  return headers.map((h, indice) => {
    const texto = cellToString(h);
    if (RE_MATRICULA.test(texto)) return { indice, alvo: 'MATRICULA' as const };
    if (RE_CPF.test(texto)) return { indice, alvo: 'CPF' as const };
    if (RE_NOME.test(texto)) return { indice, alvo: 'NOME' as const };
    if (!texto) return { indice, alvo: 'IGNORAR' as const };
    return {
      indice,
      alvo: 'RUBRICA' as const,
      descricao: texto,
      rubricaTipo: (RE_DESCONTO.test(texto)
        ? 'DESCONTO'
        : 'PROVENTO') as RubricaTipo,
    };
  });
}

export function assinaturaColunas(headers: Cell[]): string {
  return headers.map((h) => cellToString(h).toLowerCase()).join('|');
}
