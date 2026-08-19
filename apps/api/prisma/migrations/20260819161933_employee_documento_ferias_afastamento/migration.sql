-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "leaveRecordId" UUID,
ADD COLUMN     "vacationRequestId" UUID;

-- CreateIndex
CREATE INDEX "employee_documentos_vacationRequestId_idx" ON "employee_documentos"("vacationRequestId");

-- CreateIndex
CREATE INDEX "employee_documentos_leaveRecordId_idx" ON "employee_documentos"("leaveRecordId");

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_vacationRequestId_fkey" FOREIGN KEY ("vacationRequestId") REFERENCES "vacation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_leaveRecordId_fkey" FOREIGN KEY ("leaveRecordId") REFERENCES "leave_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
