-- AlterEnum
ALTER TYPE "termination_status" ADD VALUE 'RASCUNHO';
ALTER TYPE "termination_status" ADD VALUE 'AGUARDANDO_EXAME';
ALTER TYPE "termination_status" ADD VALUE 'PRONTO_PARA_EFETIVAR';
ALTER TYPE "termination_status" ADD VALUE 'EFETIVADO';
ALTER TYPE "termination_status" ADD VALUE 'EM_HOMOLOGACAO';
ALTER TYPE "termination_status" ADD VALUE 'CANCELADO';

-- AlterEnum
ALTER TYPE "termination_type" ADD VALUE 'JUSTA_CAUSA';
ALTER TYPE "termination_type" ADD VALUE 'ACORDO_MUTUO';
ALTER TYPE "termination_type" ADD VALUE 'FIM_CONTRATO_EXPERIENCIA';
ALTER TYPE "termination_type" ADD VALUE 'APOSENTADORIA';
ALTER TYPE "termination_type" ADD VALUE 'RESCISAO_INDIRETA';
ALTER TYPE "termination_type" ADD VALUE 'OBITO';

-- AlterTable
ALTER TABLE "termination_checklist_defs" ADD COLUMN     "aplicaTipos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'PROCESSO';

-- AlterTable
ALTER TABLE "terminations" ADD COLUMN     "avisoPrevioInicio" DATE,
ADD COLUMN     "avisoPrevioTipo" TEXT,
ADD COLUMN     "calculoRescisao" JSONB,
ADD COLUMN     "dataBeneficioInss" DATE,
ADD COLUMN     "esocialEnviadoEm" TIMESTAMP(3),
ADD COLUMN     "esocialEvento" TEXT,
ADD COLUMN     "esocialProtocolo" TEXT,
ADD COLUMN     "exigeHomologacao" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: sugestão de checklist padrão (seção 4 da espec), só para tenants que ainda não têm
-- NENHUM item de checklist de desligamento configurado — evita duplicar/poluir checklists que o
-- tenant já customizou.
INSERT INTO "termination_checklist_defs" (id, "tenantId", key, nome, ativo, bloqueante, ordem, categoria, "aplicaTipos")
SELECT gen_random_uuid(), t.id, item.key, item.nome, true, item.bloqueante, item.ordem, item.categoria, item."aplicaTipos"
FROM "tenants" t
CROSS JOIN (VALUES
  ('comunicacao_gestor', 'Comunicação ao gestor direto', true, 0, 'PROCESSO', ARRAY[]::TEXT[]),
  ('entrevista_agendada', 'Entrevista de desligamento agendada', false, 1, 'PROCESSO', ARRAY[]::TEXT[]),
  ('devolucao_equipamentos', 'Devolução de equipamentos e acessos', true, 2, 'PROCESSO', ARRAY[]::TEXT[]),
  ('comunicacao_financeiro', 'Comunicação ao financeiro sobre data de corte', true, 3, 'PROCESSO', ARRAY[]::TEXT[]),
  ('exame_demissional', 'Exame demissional agendado/realizado', true, 4, 'COMPLIANCE', ARRAY[]::TEXT[]),
  ('calculo_previo', 'Cálculo prévio da rescisão gerado', true, 5, 'COMPLIANCE', ARRAY[]::TEXT[]),
  ('verificacao_homologacao', 'Verificação de homologação necessária', false, 6, 'COMPLIANCE', ARRAY[]::TEXT[]),
  ('baixa_esocial', 'Baixa em carteira/eSocial programada', true, 7, 'COMPLIANCE', ARRAY[]::TEXT[]),
  ('evidencia_motivo', 'Documentação/evidência do motivo anexada', true, 8, 'COMPLIANCE', ARRAY['JUSTA_CAUSA']::TEXT[]),
  ('advertencias_registradas', 'Advertências/suspensões anteriores registradas', true, 9, 'COMPLIANCE', ARRAY['JUSTA_CAUSA']::TEXT[]),
  ('parecer_juridico', 'Parecer jurídico revisado (recomendado)', false, 10, 'COMPLIANCE', ARRAY['JUSTA_CAUSA']::TEXT[])
) AS item(key, nome, bloqueante, ordem, categoria, "aplicaTipos")
WHERE NOT EXISTS (SELECT 1 FROM "termination_checklist_defs" WHERE "tenantId" = t.id);
