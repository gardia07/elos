-- Seed the default risk impact weights (RISK_WEIGHT_DEFAULTS in
-- src/risk/risk-weights.ts) for every existing tenant -- registerTenant()
-- seeds the same list for new tenants going forward (see auth.service.ts).
-- sistema = true, but rows stay editable (impacto/ativo) per tenant without
-- a new deploy, per RiskEngineService.

DO $$
DECLARE
  t RECORD;
  rules CONSTANT text[][] := ARRAY[
    ARRAY['DP', 'documentacao_cadastro_zero_conforme', '5', 'Documentação/cadastro do colaborador 0% conforme'],
    ARRAY['DP', 'ferias_vencidas_ate_60_dias', '3', 'Férias vencidas há até 60 dias'],
    ARRAY['DP', 'ferias_vencidas_61_a_180_dias', '4', 'Férias vencidas entre 61 e 180 dias'],
    ARRAY['DP', 'ferias_vencidas_acima_180_dias', '5', 'Férias vencidas há mais de 180 dias'],
    ARRAY['DP', 'ponto_eletronico_pendente', '2', 'Ocorrência de ponto eletrônico pendente de justificativa'],
    ARRAY['DP', 'contrato_experiencia_nao_formalizado', '5', 'Contrato de experiência não formalizado'],
    ARRAY['DP', 'exame_admissional_demissional_pendente', '4', 'Exame admissional/demissional pendente'],
    ARRAY['SST', 'exame_periodico_vencido', '4', 'Exame periódico vencido'],
    ARRAY['SST', 'epi_nao_registrado', '3', 'EPI não registrado/vencido'],
    ARRAY['SST', 'treinamento_nr_vencido', '4', 'Treinamento de NR obrigatório vencido'],
    ARRAY['SST', 'pgr_pcmso_desatualizado', '5', 'Ação de PGR/PCMSO atrasada'],
    ARRAY['Compliance', 'politica_interna_nao_assinada', '2', 'Política interna não assinada'],
    ARRAY['Compliance', 'conflito_interesse_nao_declarado', '4', 'Conflito de interesse não declarado'],
    ARRAY['Compliance', 'denuncia_caso_aberto_prolongado', '4', 'Canal de denúncia com caso em aberto há muito tempo'],
    ARRAY['Psicologia', 'avaliacao_psicossocial_pendente', '3', 'Avaliação psicossocial pendente (NR-1)'],
    ARRAY['Psicologia', 'afastamento_saude_mental_sem_acompanhamento', '4', 'Afastamento por saúde mental sem acompanhamento']
  ];
  i INT;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    FOR i IN 1..array_length(rules, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "risk_impact_rules" WHERE "tenantId" = t.id AND "tipo" = rules[i][2]
      ) THEN
        INSERT INTO "risk_impact_rules"
          ("id", "tenantId", "categoria", "tipo", "impacto", "label", "ativo", "sistema", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), t.id, rules[i][1], rules[i][2], rules[i][3]::int, rules[i][4], true, true, now(), now());
      END IF;
    END LOOP;
  END LOOP;
END $$;
