-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "terminationId" UUID;

-- CreateIndex
CREATE INDEX "employee_documentos_terminationId_idx" ON "employee_documentos"("terminationId");

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_terminationId_fkey" FOREIGN KEY ("terminationId") REFERENCES "terminations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
