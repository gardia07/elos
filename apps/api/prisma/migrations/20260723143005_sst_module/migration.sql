-- CreateEnum
CREATE TYPE "accident_tipo" AS ENUM ('TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL');

-- CreateEnum
CREATE TYPE "accident_status" AS ENUM ('EM_ANALISE', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "exame_tipo" AS ENUM ('ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO', 'DEMISSIONAL');

-- CreateEnum
CREATE TYPE "exame_resultado" AS ENUM ('APTO', 'INAPTO');

-- CreateEnum
CREATE TYPE "pgr_action_status" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('ALTO', 'MEDIO', 'BAIXO');

-- CreateTable
CREATE TABLE "accidents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,
    "tipoAcidente" "accident_tipo" NOT NULL,
    "comAfastamento" BOOLEAN NOT NULL DEFAULT false,
    "diasAfastamento" INTEGER NOT NULL DEFAULT 0,
    "dataAcidente" DATE NOT NULL,
    "dataEmissaoCat" DATE NOT NULL,
    "descricao" TEXT,
    "status" "accident_status" NOT NULL DEFAULT 'EM_ANALISE',
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "causaRaiz" TEXT,
    "acaoCorretiva" TEXT,
    "notaEncerramento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupational_exams" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,
    "tipo" "exame_tipo" NOT NULL,
    "dataPrevista" DATE NOT NULL,
    "dataRealizada" DATE,
    "resultado" "exame_resultado",
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupational_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nr_training_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "curso" TEXT NOT NULL,
    "dataRealizacao" DATE NOT NULL,
    "validadeMeses" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nr_training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pgr_actions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "acao" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "prazo" DATE NOT NULL,
    "status" "pgr_action_status" NOT NULL DEFAULT 'PLANEJADA',

    CONSTRAINT "pgr_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_map_entries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "setor" TEXT NOT NULL,
    "riscos" TEXT NOT NULL,
    "nivel" "risk_level" NOT NULL,

    CONSTRAINT "risk_map_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_settings" (
    "tenantId" UUID NOT NULL,
    "mapaRiscosEsocialSentAt" TIMESTAMP(3),

    CONSTRAINT "sst_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX "accidents_tenantId_idx" ON "accidents"("tenantId");

-- CreateIndex
CREATE INDEX "occupational_exams_tenantId_idx" ON "occupational_exams"("tenantId");

-- CreateIndex
CREATE INDEX "nr_training_records_tenantId_idx" ON "nr_training_records"("tenantId");

-- CreateIndex
CREATE INDEX "pgr_actions_tenantId_idx" ON "pgr_actions"("tenantId");

-- CreateIndex
CREATE INDEX "risk_map_entries_tenantId_idx" ON "risk_map_entries"("tenantId");

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nr_training_records" ADD CONSTRAINT "nr_training_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nr_training_records" ADD CONSTRAINT "nr_training_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pgr_actions" ADD CONSTRAINT "pgr_actions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_map_entries" ADD CONSTRAINT "risk_map_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_settings" ADD CONSTRAINT "sst_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
