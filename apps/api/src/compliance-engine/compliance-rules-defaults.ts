/**
 * Fonte central da base de conhecimento juridica do Motor de Conformidade
 * Documental -- tipos de documento exigiveis e as regras que os ligam a
 * eventos do cadastro do colaborador (tipo_evento_gatilho, prazo, se
 * bloqueia o colaborador, base legal).
 *
 * Só é lido no signup, pra SEMEAR `tipos_documento_conformidade` e
 * `regras_conformidade` de cada tenant (mesmo padrão de
 * CLT_DOCUMENT_REQUIREMENTS e RISK_WEIGHT_DEFAULTS) -- depois disso quem
 * manda são as tabelas: dá pra ajustar prazo/bloqueante/base legal, ou
 * cadastrar uma regra nova (ex.: NR nova exigindo outro documento), sem
 * precisar de deploy.
 *
 * `prazoDias = 0` representa "antes do início/vigência" ou "imediato" --
 * a pendência já nasce no limite (a formalização normalmente acontece
 * pouco depois da decisão operacional ser tomada e registrada).
 */
export interface ComplianceDocumentoDefault {
  nome: string;
  categoria: 'ADMISSIONAL' | 'CONTRATUAL' | 'SAUDE_OCUPACIONAL' | 'RESCISORIO' | 'AFASTAMENTO';
  requerAssinaturaColaborador: boolean;
  requerAssinaturaEmpresa: boolean;
  validadeDias: number | null;
}

export const COMPLIANCE_DOCUMENTOS_DEFAULTS: ComplianceDocumentoDefault[] = [
  { nome: 'Contrato de admissão assinado', categoria: 'ADMISSIONAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'ASO de mudança de função', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'Aditivo contratual de função', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Aditivo contratual de jornada', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Aditivo contratual de salário/cargo', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Atestado médico', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'CAT (Comunicação de Acidente de Trabalho)', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'ASO de retorno ao trabalho', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'Termo de licença-maternidade', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'Aditivo contratual de transferência', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Aditivo de teletrabalho', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Termo de advertência/suspensão', categoria: 'CONTRATUAL', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'ASO periódico', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: 365 },
  { nome: 'Certificado de treinamento NR', categoria: 'SAUDE_OCUPACIONAL', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
  { nome: 'Checklist rescisório completo', categoria: 'RESCISORIO', requerAssinaturaColaborador: true, requerAssinaturaEmpresa: true, validadeDias: null },
  { nome: 'Comunicação de recaída ao INSS', categoria: 'AFASTAMENTO', requerAssinaturaColaborador: false, requerAssinaturaEmpresa: false, validadeDias: null },
];

export interface ComplianceRegraDefault {
  tipoEventoGatilho:
    | 'ADMISSAO'
    | 'MUDANCA_CARGO_FUNCAO'
    | 'MUDANCA_CARGA_HORARIA'
    | 'MUDANCA_SALARIAL'
    | 'INICIO_AFASTAMENTO'
    | 'ACIDENTE_TRABALHO'
    | 'RETORNO_AFASTAMENTO'
    | 'LICENCA_MATERNIDADE'
    | 'TRANSFERENCIA_LOCAL'
    | 'MUDANCA_REGIME_TRABALHO'
    | 'ADVERTENCIA_SUSPENSAO'
    | 'ASO_PERIODICO_VENCIDO'
    | 'TREINAMENTO_NR_VENCIDO'
    | 'DESLIGAMENTO'
    | 'AFASTAMENTO_RECAIDA_15_DIAS';
  documentoNome: string;
  condicaoAdicional: string | null;
  prazoDias: number;
  bloqueante: boolean;
  baseLegal: string;
}

export const COMPLIANCE_REGRAS_DEFAULTS: ComplianceRegraDefault[] = [
  { tipoEventoGatilho: 'ADMISSAO', documentoNome: 'Contrato de admissão assinado', condicaoAdicional: null, prazoDias: 5, bloqueante: true, baseLegal: 'Art. 29 CLT / eSocial S-2200' },
  { tipoEventoGatilho: 'MUDANCA_CARGO_FUNCAO', documentoNome: 'ASO de mudança de função', condicaoAdicional: 'Somente se o novo cargo tiver risco ocupacional diferente do anterior', prazoDias: 0, bloqueante: true, baseLegal: 'Art. 168 CLT / NR-7' },
  { tipoEventoGatilho: 'MUDANCA_CARGO_FUNCAO', documentoNome: 'Aditivo contratual de função', condicaoAdicional: null, prazoDias: 0, bloqueante: true, baseLegal: 'Art. 468 CLT' },
  { tipoEventoGatilho: 'MUDANCA_CARGA_HORARIA', documentoNome: 'Aditivo contratual de jornada', condicaoAdicional: 'Somente se a carga horária mudar de forma relevante', prazoDias: 0, bloqueante: true, baseLegal: 'Art. 468 CLT' },
  { tipoEventoGatilho: 'MUDANCA_SALARIAL', documentoNome: 'Aditivo contratual de salário/cargo', condicaoAdicional: null, prazoDias: 30, bloqueante: false, baseLegal: 'Art. 468 CLT' },
  { tipoEventoGatilho: 'INICIO_AFASTAMENTO', documentoNome: 'Atestado médico', condicaoAdicional: null, prazoDias: 15, bloqueante: true, baseLegal: 'Art. 6º Lei 605/49' },
  { tipoEventoGatilho: 'ACIDENTE_TRABALHO', documentoNome: 'CAT (Comunicação de Acidente de Trabalho)', condicaoAdicional: null, prazoDias: 1, bloqueante: true, baseLegal: 'Art. 22, Lei 8.213/91' },
  { tipoEventoGatilho: 'RETORNO_AFASTAMENTO', documentoNome: 'ASO de retorno ao trabalho', condicaoAdicional: 'Somente se o afastamento durou 30 dias ou mais', prazoDias: 0, bloqueante: true, baseLegal: 'NR-7' },
  { tipoEventoGatilho: 'LICENCA_MATERNIDADE', documentoNome: 'Termo de licença-maternidade', condicaoAdicional: null, prazoDias: 0, bloqueante: false, baseLegal: 'Art. 392 CLT' },
  { tipoEventoGatilho: 'TRANSFERENCIA_LOCAL', documentoNome: 'Aditivo contratual de transferência', condicaoAdicional: null, prazoDias: 0, bloqueante: true, baseLegal: 'Art. 469 CLT' },
  { tipoEventoGatilho: 'MUDANCA_REGIME_TRABALHO', documentoNome: 'Aditivo de teletrabalho', condicaoAdicional: null, prazoDias: 0, bloqueante: true, baseLegal: 'Art. 75-C CLT' },
  { tipoEventoGatilho: 'ADVERTENCIA_SUSPENSAO', documentoNome: 'Termo de advertência/suspensão', condicaoAdicional: null, prazoDias: 0, bloqueante: false, baseLegal: 'Poder disciplinar do empregador' },
  { tipoEventoGatilho: 'ASO_PERIODICO_VENCIDO', documentoNome: 'ASO periódico', condicaoAdicional: null, prazoDias: 0, bloqueante: true, baseLegal: 'NR-7' },
  { tipoEventoGatilho: 'TREINAMENTO_NR_VENCIDO', documentoNome: 'Certificado de treinamento NR', condicaoAdicional: null, prazoDias: 0, bloqueante: true, baseLegal: 'NR aplicável (ex.: NR-35 anual)' },
  { tipoEventoGatilho: 'DESLIGAMENTO', documentoNome: 'Checklist rescisório completo', condicaoAdicional: null, prazoDias: 10, bloqueante: true, baseLegal: 'Art. 477 CLT' },
  {
    tipoEventoGatilho: 'AFASTAMENTO_RECAIDA_15_DIAS',
    documentoNome: 'Comunicação de recaída ao INSS',
    condicaoAdicional: 'Episódio de afastamento pelo mesmo CID cruzou 15 dias acumulados dentro da janela de 60 dias -- comunicar ao INSS que se trata do mesmo motivo (campo infoMesmoMtv do S-2230)',
    prazoDias: 2,
    bloqueante: false,
    baseLegal: 'Art. 75, §§3º-5º, Decreto 3.048/99',
  },
];
