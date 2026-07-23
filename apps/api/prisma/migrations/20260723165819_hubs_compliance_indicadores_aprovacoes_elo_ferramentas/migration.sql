-- CreateEnum
CREATE TYPE "requisition_status" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "ethics_case_categoria" AS ENUM ('ASSEDIO', 'DISCRIMINACAO', 'FRAUDE', 'CONFLITO_INTERESSE', 'OUTRO');

-- CreateEnum
CREATE TYPE "ethics_case_status" AS ENUM ('ABERTO', 'EM_INVESTIGACAO', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "pcd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "racaCor" TEXT;

-- AlterTable
ALTER TABLE "job_requisitions" ADD COLUMN     "contrato" "job_contrato" NOT NULL DEFAULT 'CLT',
ADD COLUMN     "faixaSalarial" DECIMAL(12,2),
ADD COLUMN     "prioridade" TEXT NOT NULL DEFAULT 'Normal',
ADD COLUMN     "respondidoEm" TIMESTAMP(3),
ADD COLUMN     "status" "requisition_status" NOT NULL DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "razaoSocial" TEXT;

-- CreateTable
CREATE TABLE "ethics_cases" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "protocolo" TEXT NOT NULL,
    "categoria" "ethics_case_categoria" NOT NULL,
    "descricao" TEXT NOT NULL,
    "anonimo" BOOLEAN NOT NULL DEFAULT true,
    "denuncianteNome" TEXT,
    "status" "ethics_case_status" NOT NULL DEFAULT 'ABERTO',
    "conclusao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ethics_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acknowledgments" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elo_conversations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "modoAgente" BOOLEAN NOT NULL DEFAULT false,
    "acaoExecutada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elo_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "conectado" BOOLEAN NOT NULL DEFAULT false,
    "ultimaSincronizacaoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ethics_cases_tenantId_idx" ON "ethics_cases"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ethics_cases_tenantId_protocolo_key" ON "ethics_cases"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "compliance_policies_tenantId_idx" ON "compliance_policies"("tenantId");

-- CreateIndex
CREATE INDEX "policy_acknowledgments_policyId_idx" ON "policy_acknowledgments"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acknowledgments_policyId_employeeId_key" ON "policy_acknowledgments"("policyId", "employeeId");

-- CreateIndex
CREATE INDEX "elo_conversations_tenantId_userId_createdAt_idx" ON "elo_conversations"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_connections_tenantId_idx" ON "integration_connections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_tenantId_nome_key" ON "integration_connections"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "announcements_tenantId_idx" ON "announcements"("tenantId");

-- AddForeignKey
ALTER TABLE "ethics_cases" ADD CONSTRAINT "ethics_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_policies" ADD CONSTRAINT "compliance_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "compliance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elo_conversations" ADD CONSTRAINT "elo_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
