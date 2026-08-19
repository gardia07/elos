-- CreateEnum
CREATE TYPE "tipo_fracao_ferias" AS ENUM ('NORMAL', 'COLETIVA');

-- CreateEnum
CREATE TYPE "status_fracao_ferias" AS ENUM ('PENDENTE', 'APROVADA', 'REPROVADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "fracaoDeFeriasId" UUID;

-- CreateTable
CREATE TABLE "periodos_aquisitivos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "origemSuspensaoId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodos_aquisitivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fracoes_de_ferias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periodoAquisitivoId" UUID NOT NULL,
    "tipo" "tipo_fracao_ferias" NOT NULL DEFAULT 'NORMAL',
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "dias" INTEGER NOT NULL,
    "diasAbono" INTEGER NOT NULL DEFAULT 0,
    "antecipa13" BOOLEAN NOT NULL DEFAULT false,
    "status" "status_fracao_ferias" NOT NULL DEFAULT 'PENDENTE',
    "solicitadoPorId" UUID,
    "aprovadoPorId" UUID,
    "dataAprovacao" TIMESTAMP(3),
    "avisoFormalizadoEm" TIMESTAMP(3),
    "justificativa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fracoes_de_ferias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faltas_injustificadas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "motivo" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faltas_injustificadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periodos_aquisitivos_tenantId_employeeId_idx" ON "periodos_aquisitivos"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_aquisitivos_tenantId_employeeId_numero_key" ON "periodos_aquisitivos"("tenantId", "employeeId", "numero");

-- CreateIndex
CREATE INDEX "fracoes_de_ferias_tenantId_periodoAquisitivoId_idx" ON "fracoes_de_ferias"("tenantId", "periodoAquisitivoId");

-- CreateIndex
CREATE INDEX "faltas_injustificadas_tenantId_employeeId_data_idx" ON "faltas_injustificadas"("tenantId", "employeeId", "data");

-- CreateIndex
CREATE INDEX "employee_documentos_fracaoDeFeriasId_idx" ON "employee_documentos"("fracaoDeFeriasId");

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_fracaoDeFeriasId_fkey" FOREIGN KEY ("fracaoDeFeriasId") REFERENCES "fracoes_de_ferias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_aquisitivos" ADD CONSTRAINT "periodos_aquisitivos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_aquisitivos" ADD CONSTRAINT "periodos_aquisitivos_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_aquisitivos" ADD CONSTRAINT "periodos_aquisitivos_origemSuspensaoId_fkey" FOREIGN KEY ("origemSuspensaoId") REFERENCES "leave_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fracoes_de_ferias" ADD CONSTRAINT "fracoes_de_ferias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fracoes_de_ferias" ADD CONSTRAINT "fracoes_de_ferias_periodoAquisitivoId_fkey" FOREIGN KEY ("periodoAquisitivoId") REFERENCES "periodos_aquisitivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faltas_injustificadas" ADD CONSTRAINT "faltas_injustificadas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faltas_injustificadas" ADD CONSTRAINT "faltas_injustificadas_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
