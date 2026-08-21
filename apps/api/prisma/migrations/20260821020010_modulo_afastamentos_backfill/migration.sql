-- Seed MOTIVOS_AFASTAMENTO_DEFAULTS (dp/afastamentos/motivos-afastamento-defaults.ts) and the
-- new AFASTAMENTO_RECAIDA_15_DIAS document type + compliance rule
-- (compliance-rules-defaults.ts) for every existing tenant -- registerTenant()
-- seeds the same lists for new tenants going forward (see auth.service.ts).
-- Mesmo padrão idempotente de 20260820220930_motor_conformidade_documental_backfill.

DO $$
DECLARE
  t RECORD;
  motivos CONSTANT text[][] := ARRAY[
    ARRAY['01', 'Acidente/doença relacionada ao trabalho', 'OCUPACIONAL', 'true', 'true'],
    ARRAY['03', 'Acidente/doença não relacionada ao trabalho', 'NAO_OCUPACIONAL', 'true', 'false']
  ];
  i INT;
  docId UUID;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    -- Catálogo de motivos de afastamento
    FOR i IN 1..array_length(motivos, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "motivos_afastamento" WHERE "tenantId" = t.id AND "codigoEsocial" = motivos[i][1]
      ) THEN
        INSERT INTO "motivos_afastamento"
          ("id", "tenantId", "codigoEsocial", "descricao", "natureza", "exigeCid", "geraEstabilidade", "ativo", "sistema", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, motivos[i][1], motivos[i][2], motivos[i][3]::"natureza_afastamento", motivos[i][4]::boolean, motivos[i][5]::boolean, true, true, now());
      END IF;
    END LOOP;

    -- Documento + regra de compliance da recaída (AAFASTAMENTO_RECAIDA_15_DIAS)
    IF NOT EXISTS (
      SELECT 1 FROM "tipos_documento_conformidade" WHERE "tenantId" = t.id AND "nome" = 'Comunicação de recaída ao INSS'
    ) THEN
      INSERT INTO "tipos_documento_conformidade"
        ("id", "tenantId", "nome", "categoria", "requerAssinaturaColaborador", "requerAssinaturaEmpresa", "validadeDias", "ativo", "sistema", "createdAt")
      VALUES
        (gen_random_uuid(), t.id, 'Comunicação de recaída ao INSS', 'AFASTAMENTO', false, false, NULL, true, true, now());
    END IF;

    SELECT "id" INTO docId FROM "tipos_documento_conformidade" WHERE "tenantId" = t.id AND "nome" = 'Comunicação de recaída ao INSS';

    IF NOT EXISTS (
      SELECT 1 FROM "regras_conformidade"
      WHERE "tenantId" = t.id AND "tipoEventoGatilho" = 'AFASTAMENTO_RECAIDA_15_DIAS'::"tipo_evento_colaborador" AND "documentoExigidoId" = docId
    ) THEN
      INSERT INTO "regras_conformidade"
        ("id", "tenantId", "tipoEventoGatilho", "condicaoAdicional", "documentoExigidoId", "prazoDias", "bloqueante", "baseLegal", "ativo", "sistema", "createdAt")
      VALUES
        (gen_random_uuid(), t.id, 'AFASTAMENTO_RECAIDA_15_DIAS'::"tipo_evento_colaborador",
         'Episódio de afastamento pelo mesmo CID cruzou 15 dias acumulados dentro da janela de 60 dias -- comunicar ao INSS que se trata do mesmo motivo (campo infoMesmoMtv do S-2230)',
         docId, 2, false, 'Art. 75, §§3º-5º, Decreto 3.048/99', true, true, now());
    END IF;
  END LOOP;
END $$;
