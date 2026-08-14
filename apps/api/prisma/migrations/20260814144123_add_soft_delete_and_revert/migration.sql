-- AlterTable
ALTER TABLE "cargo_salario_historico" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "contatos_emergencia" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "historico_eventos" ADD COLUMN     "entidadeId" UUID,
ADD COLUMN     "entidadeTipo" TEXT;

-- AlterTable
ALTER TABLE "ocorrencias" ADD COLUMN     "deletedAt" TIMESTAMP(3);
