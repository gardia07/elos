-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "ocorrenciaId" UUID;

-- AlterTable
ALTER TABLE "vacation_requests" ADD COLUMN     "diasAbono" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ocorrencias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ocorrencias_tenantId_employeeId_idx" ON "ocorrencias"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "employee_documentos_ocorrenciaId_idx" ON "employee_documentos"("ocorrenciaId");

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "ocorrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
