/**
 * Parâmetros trabalhistas usados nas simulações de férias/rescisão.
 * Referências: aviso prévio proporcional (Lei 12.506/2011), aviso prévio
 * reduzido no acordo e multa de FGTS reduzida (art. 484-A da CLT).
 * Simulação apenas — não substitui o cálculo oficial da contabilidade.
 */

export const FGTS_ALIQUOTA = 0.08;

/** Espelha o enum Prisma `TerminationType` — mantido como union de string local pra não acoplar este
 * módulo (usado também de forma avulsa em /dp/simulacoes) ao client do Prisma. */
export type TipoRescisao =
  | 'SEM_JUSTA_CAUSA'
  | 'PEDIDO_DEMISSAO'
  | 'ACORDO'
  | 'JUSTA_CAUSA'
  | 'ACORDO_MUTUO'
  | 'FIM_CONTRATO_EXPERIENCIA'
  | 'APOSENTADORIA'
  | 'RESCISAO_INDIRETA'
  | 'OBITO';

/**
 * `FIM_CONTRATO_EXPERIENCIA`, `APOSENTADORIA` e `OBITO` têm regras mais variáveis por contexto
 * (quem antecipou o contrato de experiência, se a aposentadoria foi por iniciativa do empregador,
 * regras específicas de sucessão em óbito) — os valores abaixo são uma base conservadora, não a
 * regra completa da CLT para esses casos. Revisar manualmente antes de usar como referência final.
 */
export const MULTA_FGTS_POR_TIPO: Record<TipoRescisao, number> = {
  SEM_JUSTA_CAUSA: 0.4,
  ACORDO: 0.2,
  ACORDO_MUTUO: 0.2,
  PEDIDO_DEMISSAO: 0,
  JUSTA_CAUSA: 0,
  FIM_CONTRATO_EXPERIENCIA: 0,
  APOSENTADORIA: 0,
  RESCISAO_INDIRETA: 0.4,
  OBITO: 0,
};

/** Aviso prévio indenizado: integral na dispensa sem justa causa e na rescisão indireta, pela metade no acordo, inexistente nos demais. */
export const AVISO_INDENIZADO_FRACAO_POR_TIPO: Record<TipoRescisao, number> = {
  SEM_JUSTA_CAUSA: 1,
  ACORDO: 0.5,
  ACORDO_MUTUO: 0.5,
  PEDIDO_DEMISSAO: 0,
  JUSTA_CAUSA: 0,
  FIM_CONTRATO_EXPERIENCIA: 0,
  APOSENTADORIA: 0,
  RESCISAO_INDIRETA: 1,
  OBITO: 0,
};

export const AVISO_PREVIO_BASE_DIAS = 30;
export const AVISO_PREVIO_DIAS_POR_ANO = 3;
export const AVISO_PREVIO_MAX_DIAS = 90;

export function diasAvisoPrevio(anosCompletos: number): number {
  return Math.min(
    AVISO_PREVIO_BASE_DIAS + AVISO_PREVIO_DIAS_POR_ANO * anosCompletos,
    AVISO_PREVIO_MAX_DIAS,
  );
}

export function anosCompletos(inicio: Date, fim: Date): number {
  let anos = fim.getFullYear() - inicio.getFullYear();
  const aniversario = new Date(
    fim.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
  );
  if (fim < aniversario) anos--;
  return Math.max(0, anos);
}

/** Meses completos entre duas datas (conta o mês corrente como completo só depois do "dia de virada" do início). */
export function mesesCompletos(inicio: Date, fim: Date): number {
  let meses =
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth() - inicio.getMonth());
  if (fim.getDate() < inicio.getDate()) meses--;
  return Math.max(0, meses);
}
