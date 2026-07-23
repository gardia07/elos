-- CreateEnum
CREATE TYPE "document_req_status" AS ENUM ('MISSING', 'PENDING', 'COMPLIANT', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('ABERTA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "tenant_license_status" AS ENUM ('TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA', 'EXPIRADA');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "conformidadeDocumental" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "termination_checklist_defs" ADD COLUMN     "bloqueante" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "validadeDias" INTEGER,
    "aplicaStatus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aplicaTipoContrato" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aplicaDepartamento" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aplicaCargo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_document_requirements" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "status" "document_req_status" NOT NULL DEFAULT 'MISSING',
    "expiraEm" TIMESTAMP(3),
    "observacao" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "prioridade" "task_priority" NOT NULL DEFAULT 'MEDIA',
    "status" "task_status" NOT NULL DEFAULT 'ABERTA',
    "origem" TEXT NOT NULL DEFAULT 'SISTEMA',
    "alertKey" TEXT,
    "prazo" TIMESTAMP(3),
    "assignedUserId" UUID,
    "detalhes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "modulos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxUsuarios" INTEGER NOT NULL,
    "maxColaboradores" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_licenses" (
    "tenantId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "tenant_license_status" NOT NULL DEFAULT 'TRIAL',
    "iniciaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3),
    "maxUsuarios" INTEGER NOT NULL,
    "maxColaboradores" INTEGER NOT NULL,
    "modulos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_licenses_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ip_createdAt_idx" ON "login_attempts"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "document_requirements_tenantId_idx" ON "document_requirements"("tenantId");

-- CreateIndex
CREATE INDEX "employee_document_requirements_employeeId_idx" ON "employee_document_requirements"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_document_requirements_employeeId_requirementId_key" ON "employee_document_requirements"("employeeId", "requirementId");

-- CreateIndex
CREATE INDEX "tasks_tenantId_status_idx" ON "tasks"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_tenantId_alertKey_key" ON "tasks"("tenantId", "alertKey");

-- CreateIndex
CREATE UNIQUE INDEX "license_plans_code_key" ON "license_plans"("code");

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_requirements" ADD CONSTRAINT "employee_document_requirements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document_requirements" ADD CONSTRAINT "employee_document_requirements_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "document_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_licenses" ADD CONSTRAINT "tenant_licenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_licenses" ADD CONSTRAINT "tenant_licenses_planId_fkey" FOREIGN KEY ("planId") REFERENCES "license_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the commercial plan catalog. Global, not tenant data.
INSERT INTO "license_plans" ("id", "code", "nome", "descricao", "modulos", "maxUsuarios", "maxColaboradores")
VALUES
  (gen_random_uuid(), 'trial', 'Teste gratuito', 'Período de avaliação de 30 dias com limites reduzidos.',
    ARRAY['rh','dp','sst','compliance','psicologia','indicadores','elo','ferramentas','portal'], 10, 50),
  (gen_random_uuid(), 'starter', 'Starter', 'Para empresas pequenas.',
    ARRAY['rh','dp','sst','ferramentas','portal'], 15, 100),
  (gen_random_uuid(), 'pro', 'Pro', 'Todos os módulos, sem limite de expiração.',
    ARRAY['rh','dp','sst','compliance','psicologia','indicadores','elo','ferramentas','portal'], 100, 1000);

-- Backfill: give every tenant created before licensing existed a running
-- trial license, so this feature doesn't lock anyone out retroactively.
INSERT INTO "tenant_licenses" ("tenantId", "planId", "status", "iniciaEm", "expiraEm", "maxUsuarios", "maxColaboradores", "modulos", "updatedAt")
SELECT t."id", p."id", 'TRIAL', now(), now() + interval '30 days', p."maxUsuarios", p."maxColaboradores", p."modulos", now()
FROM "tenants" t, "license_plans" p
WHERE p."code" = 'trial'
ON CONFLICT ("tenantId") DO NOTHING;
