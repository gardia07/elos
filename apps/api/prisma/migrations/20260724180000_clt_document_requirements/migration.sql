-- AlterEnum
ALTER TYPE "document_req_status" ADD VALUE 'NAO_SE_APLICA';

-- AlterTable
ALTER TABLE "document_requirements" ADD COLUMN "sistema" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "employee_document_requirements" ADD COLUMN "arquivoNome" TEXT,
ADD COLUMN "anexadoEm" TIMESTAMP(3);

-- Seed the core CLT-mandatory admission documents for every existing
-- tenant (registerTenant() seeds the same list for new tenants going
-- forward — see auth.service.ts). sistema = true so these can't be
-- deleted from Ferramentas > Documentos, only marked "não se aplica"
-- per employee when genuinely irrelevant.
DO $$
DECLARE
  t RECORD;
  reqs CONSTANT text[][] := ARRAY[
    ARRAY['RG', 'Identificação'],
    ARRAY['CPF', 'Identificação'],
    ARRAY['CTPS', 'Identificação'],
    ARRAY['PIS/PASEP', 'Identificação'],
    ARRAY['Título de eleitor', 'Identificação'],
    ARRAY['Certificado de reservista', 'Identificação'],
    ARRAY['Certidão de nascimento ou casamento', 'Identificação'],
    ARRAY['Comprovante de residência', 'Comprovantes'],
    ARRAY['Comprovante de escolaridade', 'Comprovantes'],
    ARRAY['Foto 3x4', 'Comprovantes'],
    ARRAY['ASO admissional', 'Saúde']
  ];
  i INT;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    FOR i IN 1..array_length(reqs, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "document_requirements" WHERE "tenantId" = t.id AND "nome" = reqs[i][1]
      ) THEN
        INSERT INTO "document_requirements"
          ("id", "tenantId", "nome", "categoria", "obrigatorio", "sistema", "validadeDias", "aplicaStatus", "aplicaTipoContrato", "aplicaDepartamento", "aplicaCargo", "ativo", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, reqs[i][1], reqs[i][2], true, true, NULL, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], true, now());
      END IF;
    END LOOP;
  END LOOP;
END $$;
