-- CreateEnum
CREATE TYPE "agenda_recorrencia_frequencia" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL', 'PERSONALIZADA');

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "recorrenciaId" UUID;

-- CreateTable
CREATE TABLE "agenda_recorrencias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "frequencia" "agenda_recorrencia_frequencia" NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "diasDaSemana" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posicaoNoMes" INTEGER,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_recorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_recorrencias_tenantId_idx" ON "agenda_recorrencias"("tenantId");

-- CreateIndex
CREATE INDEX "agenda_items_recorrenciaId_idx" ON "agenda_items"("recorrenciaId");

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_recorrenciaId_fkey" FOREIGN KEY ("recorrenciaId") REFERENCES "agenda_recorrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_recorrencias" ADD CONSTRAINT "agenda_recorrencias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
