/**
 * Catálogo inicial de MotivoAfastamento, semeado no signup (mesmo padrão de
 * COMPLIANCE_DOCUMENTOS_DEFAULTS / RISK_WEIGHT_DEFAULTS) -- só os códigos da
 * Tabela 18 do eSocial já confirmados (01 e 03). O restante da tabela precisa
 * ser conferido na fonte oficial (gov.br/esocial) antes de ser adicionado
 * aqui; o motor de episódio funciona por motivoAfastamentoId, não pelo
 * código, então o catálogo cresce depois sem exigir migração nova.
 */
export interface MotivoAfastamentoDefault {
  codigoEsocial: string;
  descricao: string;
  natureza: 'OCUPACIONAL' | 'NAO_OCUPACIONAL';
  exigeCid: boolean;
  geraEstabilidade: boolean;
}

export const MOTIVOS_AFASTAMENTO_DEFAULTS: MotivoAfastamentoDefault[] = [
  { codigoEsocial: '01', descricao: 'Acidente/doença relacionada ao trabalho', natureza: 'OCUPACIONAL', exigeCid: true, geraEstabilidade: true },
  { codigoEsocial: '03', descricao: 'Acidente/doença não relacionada ao trabalho', natureza: 'NAO_OCUPACIONAL', exigeCid: true, geraEstabilidade: false },
];
