-- AlterEnum
ALTER TYPE "beneficio_categoria" ADD VALUE 'OUTRO';

-- CreateTable
CREATE TABLE "adesoes_beneficio_fixo" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "beneficioTipoId" UUID NOT NULL,
    "valorMensal" DECIMAL(10,2) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,

    CONSTRAINT "adesoes_beneficio_fixo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adesoes_beneficio_fixo_tenantId_idx" ON "adesoes_beneficio_fixo"("tenantId");

-- CreateIndex
CREATE INDEX "adesoes_beneficio_fixo_employeeId_idx" ON "adesoes_beneficio_fixo"("employeeId");

-- AddForeignKey
ALTER TABLE "adesoes_beneficio_fixo" ADD CONSTRAINT "adesoes_beneficio_fixo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_beneficio_fixo" ADD CONSTRAINT "adesoes_beneficio_fixo_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_beneficio_fixo" ADD CONSTRAINT "adesoes_beneficio_fixo_beneficioTipoId_fkey" FOREIGN KEY ("beneficioTipoId") REFERENCES "beneficio_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
