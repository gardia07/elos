-- CreateEnum
CREATE TYPE "time_justification_status" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "payroll_run_status" AS ENUM ('ABERTO', 'PROCESSADA');

-- CreateEnum
CREATE TYPE "payroll_guide_status" AS ENUM ('PENDENTE', 'GERADA');

-- CreateTable
CREATE TABLE "labor_deadlines" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "obrigacao" TEXT NOT NULL,
    "vencimento" DATE NOT NULL,
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collective_agreements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sindicato" TEXT NOT NULL,
    "vigenciaInicio" DATE NOT NULL,
    "vigenciaFim" DATE NOT NULL,
    "reajustePercentual" DECIMAL(5,2) NOT NULL,
    "clausulas" TEXT,
    "reajusteAplicadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collective_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_grades" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,
    "faixaMin" DECIMAL(12,2) NOT NULL,
    "faixaMax" DECIMAL(12,2) NOT NULL,
    "nivel" TEXT NOT NULL,
    "requisitos" TEXT,

    CONSTRAINT "job_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "elegibilidade" TEXT NOT NULL,
    "custoMensal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_enrollments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "benefitId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "entregaEm" DATE NOT NULL,
    "validadeMeses" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_justifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "ocorrencia" TEXT NOT NULL,
    "status" "time_justification_status" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_justifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "competencia" TEXT NOT NULL,
    "status" "payroll_run_status" NOT NULL DEFAULT 'ABERTO',
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payrollRunId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "proventos" DECIMAL(12,2) NOT NULL,
    "descontos" DECIMAL(12,2) NOT NULL,
    "liquido" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payslip_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_guides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payrollRunId" UUID NOT NULL,
    "guia" TEXT NOT NULL,
    "status" "payroll_guide_status" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "payroll_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labor_deadlines_tenantId_idx" ON "labor_deadlines"("tenantId");

-- CreateIndex
CREATE INDEX "collective_agreements_tenantId_idx" ON "collective_agreements"("tenantId");

-- CreateIndex
CREATE INDEX "job_grades_tenantId_idx" ON "job_grades"("tenantId");

-- CreateIndex
CREATE INDEX "benefits_tenantId_idx" ON "benefits"("tenantId");

-- CreateIndex
CREATE INDEX "benefit_enrollments_tenantId_idx" ON "benefit_enrollments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_enrollments_benefitId_employeeId_key" ON "benefit_enrollments"("benefitId", "employeeId");

-- CreateIndex
CREATE INDEX "equipment_items_tenantId_idx" ON "equipment_items"("tenantId");

-- CreateIndex
CREATE INDEX "time_justifications_tenantId_idx" ON "time_justifications"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_runs_tenantId_idx" ON "payroll_runs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_tenantId_competencia_key" ON "payroll_runs"("tenantId", "competencia");

-- CreateIndex
CREATE INDEX "payslip_items_tenantId_idx" ON "payslip_items"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "payslip_items_payrollRunId_employeeId_key" ON "payslip_items"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_guides_tenantId_idx" ON "payroll_guides"("tenantId");

-- AddForeignKey
ALTER TABLE "labor_deadlines" ADD CONSTRAINT "labor_deadlines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collective_agreements" ADD CONSTRAINT "collective_agreements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_grades" ADD CONSTRAINT "job_grades_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_justifications" ADD CONSTRAINT "time_justifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_justifications" ADD CONSTRAINT "time_justifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_guides" ADD CONSTRAINT "payroll_guides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_guides" ADD CONSTRAINT "payroll_guides_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
