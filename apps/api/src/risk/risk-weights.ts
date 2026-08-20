/**
 * Fonte central dos pesos de impacto (1-5) por tipo de não conformidade,
 * usada pelo RiskEngineService para montar o Risco Geral.
 *
 * Este arquivo só é lido no signup, para SEMEAR a tabela `risk_impact_rules`
 * de cada tenant (mesmo padrão de CLT_DOCUMENT_REQUIREMENTS em
 * `../rh/documents/clt-requirements.ts`) — depois disso, quem manda é a
 * tabela: um admin pode ajustar `impacto` por tenant sem precisar de novo
 * deploy, e futuramente cada cliente pode ter pesos diferentes (apetite de
 * risco varia por setor).
 *
 * `probabilidade` NÃO entra aqui: pela regra de negócio, toda não
 * conformidade já consumada (fato existente hoje, não previsão) usa sempre
 * probabilidade = 5. Escala variável fica reservada para riscos preditivos
 * futuros (ex.: previsão de vencimento), calculada em tempo de execução no
 * RiskEngineService, não nesta tabela de configuração.
 */
export interface RiskWeightDefinition {
  categoria: 'DP' | 'SST' | 'Compliance' | 'Psicologia';
  tipo: string;
  impacto: 1 | 2 | 3 | 4 | 5;
  label: string;
}

export const RISK_WEIGHT_DEFAULTS: RiskWeightDefinition[] = [
  // DP
  {
    categoria: 'DP',
    tipo: 'documentacao_cadastro_zero_conforme',
    impacto: 5,
    label: 'Documentação/cadastro do colaborador 0% conforme',
  },
  {
    categoria: 'DP',
    tipo: 'ferias_vencidas_ate_60_dias',
    impacto: 3,
    label: 'Férias vencidas há até 60 dias',
  },
  {
    categoria: 'DP',
    tipo: 'ferias_vencidas_61_a_180_dias',
    impacto: 4,
    label: 'Férias vencidas entre 61 e 180 dias',
  },
  {
    categoria: 'DP',
    tipo: 'ferias_vencidas_acima_180_dias',
    impacto: 5,
    label: 'Férias vencidas há mais de 180 dias',
  },
  {
    categoria: 'DP',
    tipo: 'ponto_eletronico_pendente',
    impacto: 2,
    label: 'Ocorrência de ponto eletrônico pendente de justificativa',
  },
  {
    categoria: 'DP',
    tipo: 'contrato_experiencia_nao_formalizado',
    impacto: 5,
    label: 'Contrato de experiência não formalizado',
  },
  {
    categoria: 'DP',
    tipo: 'exame_admissional_demissional_pendente',
    impacto: 4,
    label: 'Exame admissional/demissional pendente',
  },

  // SST
  {
    categoria: 'SST',
    tipo: 'exame_periodico_vencido',
    impacto: 4,
    label: 'Exame periódico vencido',
  },
  {
    categoria: 'SST',
    tipo: 'epi_nao_registrado',
    impacto: 3,
    label: 'EPI não registrado/vencido',
  },
  {
    categoria: 'SST',
    tipo: 'treinamento_nr_vencido',
    impacto: 4,
    label: 'Treinamento de NR obrigatório vencido',
  },
  {
    categoria: 'SST',
    tipo: 'pgr_pcmso_desatualizado',
    impacto: 5,
    label: 'Ação de PGR/PCMSO atrasada',
  },

  // Compliance
  {
    categoria: 'Compliance',
    tipo: 'politica_interna_nao_assinada',
    impacto: 2,
    label: 'Política interna não assinada',
  },
  {
    categoria: 'Compliance',
    tipo: 'conflito_interesse_nao_declarado',
    impacto: 4,
    label: 'Conflito de interesse não declarado',
  },
  {
    categoria: 'Compliance',
    tipo: 'denuncia_caso_aberto_prolongado',
    impacto: 4,
    label: 'Canal de denúncia com caso em aberto há muito tempo',
  },

  // Psicologia
  // NOTA: o módulo de Psicologia ainda não tem telas/tabelas próprias no
  // sistema (é só um rótulo hoje) -- por isso não existe fonte de dados real
  // para gerar itens desses dois tipos. Os pesos ficam cadastrados e o motor
  // de risco já reconhece a categoria, mas `collectItems()` retorna lista
  // vazia para ela até o módulo ser implementado.
  {
    categoria: 'Psicologia',
    tipo: 'avaliacao_psicossocial_pendente',
    impacto: 3,
    label: 'Avaliação psicossocial pendente (NR-1)',
  },
  {
    categoria: 'Psicologia',
    tipo: 'afastamento_saude_mental_sem_acompanhamento',
    impacto: 4,
    label: 'Afastamento por saúde mental sem acompanhamento',
  },
];
