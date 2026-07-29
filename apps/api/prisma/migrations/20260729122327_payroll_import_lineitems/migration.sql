-- CreateEnum
CREATE TYPE "payslip_origem" AS ENUM ('CALCULADO', 'IMPORTADO');

-- CreateEnum
CREATE TYPE "payroll_line_item_tipo" AS ENUM ('PROVENTO', 'DESCONTO', 'INFORMATIVO');

-- AlterTable
ALTER TABLE "payslip_items" ADD COLUMN     "origem" "payslip_origem" NOT NULL DEFAULT 'CALCULADO';

-- CreateTable
CREATE TABLE "payroll_line_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payslipItemId" UUID NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT NOT NULL,
    "tipo" "payroll_line_item_tipo" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_import_batches" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payrollRunId" UUID NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "linhasTotal" INTEGER NOT NULL,
    "linhasImportadas" INTEGER NOT NULL,
    "linhasComErro" INTEGER NOT NULL,
    "erros" JSONB,
    "importadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_import_templates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "mapeamento" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_import_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_line_items_tenantId_idx" ON "payroll_line_items"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_line_items_payslipItemId_idx" ON "payroll_line_items"("payslipItemId");

-- CreateIndex
CREATE INDEX "payroll_import_batches_tenantId_idx" ON "payroll_import_batches"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_import_templates_tenantId_idx" ON "payroll_import_templates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_import_templates_tenantId_nome_key" ON "payroll_import_templates"("tenantId", "nome");

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payslipItemId_fkey" FOREIGN KEY ("payslipItemId") REFERENCES "payslip_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_import_batches" ADD CONSTRAINT "payroll_import_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_import_batches" ADD CONSTRAINT "payroll_import_batches_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_import_templates" ADD CONSTRAINT "payroll_import_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
