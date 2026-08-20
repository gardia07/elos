-- Seed the default compliance-engine document types + rules
-- (COMPLIANCE_DOCUMENTOS_DEFAULTS / COMPLIANCE_REGRAS_DEFAULTS in
-- src/compliance-engine/compliance-rules-defaults.ts) for every existing
-- tenant -- registerTenant() seeds the same lists for new tenants going
-- forward (see auth.service.ts).

DO $$
DECLARE
  t RECORD;
  docs CONSTANT text[][] := ARRAY[
    ARRAY['Contrato de admissão assinado', 'ADMISSIONAL', 'true', 'true', ''],
    ARRAY['ASO de mudança de função', 'SAUDE_OCUPACIONAL', 'false', 'false', ''],
    ARRAY['Aditivo contratual de função', 'CONTRATUAL', 'true', 'true', ''],
    ARRAY['Aditivo contratual de jornada', 'CONTRATUAL', 'true', 'true', ''],
    ARRAY['Aditivo contratual de salário/cargo', 'CONTRATUAL', 'true', 'true', ''],
    ARRAY['Atestado médico', 'SAUDE_OCUPACIONAL', 'false', 'false', ''],
    ARRAY['CAT (Comunicação de Acidente de Trabalho)', 'SAUDE_OCUPACIONAL', 'false', 'false', ''],
    ARRAY['ASO de retorno ao trabalho', 'SAUDE_OCUPACIONAL', 'false', 'false', ''],
    ARRAY['Termo de licença-maternidade', 'CONTRATUAL', 'true', 'false', ''],
    ARRAY['Aditivo contratual de transferência', 'CONTRATUAL', 'true', 'true', ''],
    ARRAY['Aditivo de teletrabalho', 'CONTRATUAL', 'true', 'true', ''],
    ARRAY['Termo de advertência/suspensão', 'CONTRATUAL', 'true', 'false', ''],
    ARRAY['ASO periódico', 'SAUDE_OCUPACIONAL', 'false', 'false', '365'],
    ARRAY['Certificado de treinamento NR', 'SAUDE_OCUPACIONAL', 'false', 'false', ''],
    ARRAY['Checklist rescisório completo', 'RESCISORIO', 'true', 'true', '']
  ];
  regras CONSTANT text[][] := ARRAY[
    ARRAY['ADMISSAO', 'Contrato de admissão assinado', '', '5', 'true', 'Art. 29 CLT / eSocial S-2200'],
    ARRAY['MUDANCA_CARGO_FUNCAO', 'ASO de mudança de função', 'Somente se o novo cargo tiver risco ocupacional diferente do anterior', '0', 'true', 'Art. 168 CLT / NR-7'],
    ARRAY['MUDANCA_CARGO_FUNCAO', 'Aditivo contratual de função', '', '0', 'true', 'Art. 468 CLT'],
    ARRAY['MUDANCA_CARGA_HORARIA', 'Aditivo contratual de jornada', 'Somente se a carga horária mudar de forma relevante', '0', 'true', 'Art. 468 CLT'],
    ARRAY['MUDANCA_SALARIAL', 'Aditivo contratual de salário/cargo', '', '30', 'false', 'Art. 468 CLT'],
    ARRAY['INICIO_AFASTAMENTO', 'Atestado médico', '', '15', 'true', 'Art. 6º Lei 605/49'],
    ARRAY['ACIDENTE_TRABALHO', 'CAT (Comunicação de Acidente de Trabalho)', '', '1', 'true', 'Art. 22, Lei 8.213/91'],
    ARRAY['RETORNO_AFASTAMENTO', 'ASO de retorno ao trabalho', 'Somente se o afastamento durou 30 dias ou mais', '0', 'true', 'NR-7'],
    ARRAY['LICENCA_MATERNIDADE', 'Termo de licença-maternidade', '', '0', 'false', 'Art. 392 CLT'],
    ARRAY['TRANSFERENCIA_LOCAL', 'Aditivo contratual de transferência', '', '0', 'true', 'Art. 469 CLT'],
    ARRAY['MUDANCA_REGIME_TRABALHO', 'Aditivo de teletrabalho', '', '0', 'true', 'Art. 75-C CLT'],
    ARRAY['ADVERTENCIA_SUSPENSAO', 'Termo de advertência/suspensão', '', '0', 'false', 'Poder disciplinar do empregador'],
    ARRAY['ASO_PERIODICO_VENCIDO', 'ASO periódico', '', '0', 'true', 'NR-7'],
    ARRAY['TREINAMENTO_NR_VENCIDO', 'Certificado de treinamento NR', '', '0', 'true', 'NR aplicável (ex.: NR-35 anual)'],
    ARRAY['DESLIGAMENTO', 'Checklist rescisório completo', '', '10', 'true', 'Art. 477 CLT']
  ];
  i INT;
  docId UUID;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    -- Tipos de documento
    FOR i IN 1..array_length(docs, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "tipos_documento_conformidade" WHERE "tenantId" = t.id AND "nome" = docs[i][1]
      ) THEN
        INSERT INTO "tipos_documento_conformidade"
          ("id", "tenantId", "nome", "categoria", "requerAssinaturaColaborador", "requerAssinaturaEmpresa", "validadeDias", "ativo", "sistema", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, docs[i][1], docs[i][2]::"categoria_tipo_documento", docs[i][3]::boolean, docs[i][4]::boolean, NULLIF(docs[i][5], '')::int, true, true, now());
      END IF;
    END LOOP;

    -- Regras (referenciam o documento pelo nome, já semeado acima)
    FOR i IN 1..array_length(regras, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "regras_conformidade"
        WHERE "tenantId" = t.id AND "tipoEventoGatilho" = regras[i][1]::"tipo_evento_colaborador"
          AND "documentoExigidoId" = (SELECT "id" FROM "tipos_documento_conformidade" WHERE "tenantId" = t.id AND "nome" = regras[i][2])
      ) THEN
        SELECT "id" INTO docId FROM "tipos_documento_conformidade" WHERE "tenantId" = t.id AND "nome" = regras[i][2];
        INSERT INTO "regras_conformidade"
          ("id", "tenantId", "tipoEventoGatilho", "condicaoAdicional", "documentoExigidoId", "prazoDias", "bloqueante", "baseLegal", "ativo", "sistema", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, regras[i][1]::"tipo_evento_colaborador", NULLIF(regras[i][3], ''), docId, regras[i][4]::int, regras[i][5]::boolean, regras[i][6], true, true, now());
      END IF;
    END LOOP;
  END LOOP;
END $$;
