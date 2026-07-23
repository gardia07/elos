-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA', 'COLABORADOR', 'COMPLIANCE', 'COMITE_ETICA', 'PSICOLOGIA');

-- CreateEnum
CREATE TYPE "job_contrato" AS ENUM ('CLT', 'ESTAGIO');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('ABERTA', 'EM_ANALISE', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "candidate_stage" AS ENUM ('TRIAGEM', 'ENTREVISTA', 'PROPOSTA', 'CONTRATADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "candidate_pool_type" AS ENUM ('TALENT_BANK', 'BLOCKED');

-- CreateEnum
CREATE TYPE "checklist_scope" AS ENUM ('ADMISSAO', 'DESLIGAMENTO');

-- CreateEnum
CREATE TYPE "admission_status" AS ENUM ('PENDENTE_DOCUMENTO', 'AGUARDANDO_EXAME', 'PRONTO_PARA_EFETIVAR', 'EFETIVADO');

-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "evaluation_model" AS ENUM ('NOVENTA', 'CENTO_OITENTA', 'TRESSESSENTA');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "vacation_status" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "termination_type" AS ENUM ('SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'ACORDO');

-- CreateEnum
CREATE TYPE "termination_status" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'COLABORADOR',
    "employeeId" UUID,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mfaCodeHash" TEXT,
    "mfaCodeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,
    "depto" TEXT NOT NULL,
    "contrato" "job_contrato" NOT NULL DEFAULT 'CLT',
    "status" "job_status" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "origem" TEXT,
    "stage" "candidate_stage" NOT NULL DEFAULT 'TRIAGEM',
    "email" TEXT,
    "telefone" TEXT,
    "resumo" TEXT,
    "notas" TEXT,
    "scoreComunicacao" INTEGER NOT NULL DEFAULT 3,
    "scoreTecnica" INTEGER NOT NULL DEFAULT 3,
    "scoreCultura" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_pool_entries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" "candidate_pool_type" NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" TEXT,
    "vagaAnterior" TEXT,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_pool_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_costs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "depto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_interviews" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "dataLabel" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item_defs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "scope" "checklist_scope" NOT NULL DEFAULT 'ADMISSAO',
    "filial" TEXT,
    "key" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_item_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "filial" TEXT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "status" "admission_status" NOT NULL DEFAULT 'PENDENTE_DOCUMENTO',
    "origemVaga" TEXT,
    "salario" DECIMAL(12,2) NOT NULL,
    "docs" JSONB NOT NULL DEFAULT '{}',
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "contratoGerado" BOOLEAN NOT NULL DEFAULT false,
    "contratoAssinado" BOOLEAN NOT NULL DEFAULT false,
    "employeeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "filial" TEXT,
    "gestorDireto" TEXT,
    "status" "employee_status" NOT NULL DEFAULT 'ATIVO',
    "dataAdmissao" DATE NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "dataNascimento" DATE,
    "nacionalidade" TEXT,
    "estadoCivil" TEXT,
    "nomeMae" TEXT,
    "pis" TEXT,
    "ctps" TEXT,
    "genero" TEXT,
    "escolaridade" TEXT,
    "cnh" TEXT,
    "conjugeNome" TEXT,
    "conjugeCpf" TEXT,
    "salario" DECIMAL(12,2) NOT NULL,
    "tipoContrato" "job_contrato" NOT NULL DEFAULT 'CLT',
    "feriasSaldo" INTEGER NOT NULL DEFAULT 30,
    "feriasVencimento" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependentes" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "cpf" TEXT,
    "dataNascimento" DATE,

    CONSTRAINT "dependentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_eventos" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documentos" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" TEXT NOT NULL,
    "uploadEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ferias_historico" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "dias" INTEGER NOT NULL,

    CONSTRAINT "ferias_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_cycles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "modelo" "evaluation_model" NOT NULL DEFAULT 'NOVENTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "autoNota" DECIMAL(3,1),
    "gestorNota" DECIMAL(3,1),

    CONSTRAINT "evaluation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "status" "goal_status" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdi_actions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "prazo" DATE NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdi_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_requests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "status" "vacation_status" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "retorno" DATE,
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termination_checklist_defs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "termination_checklist_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "termination_type" NOT NULL,
    "motivo" TEXT,
    "status" "termination_status" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "docs" JSONB NOT NULL DEFAULT '{}',
    "esocialSent" BOOLEAN NOT NULL DEFAULT false,
    "termoGerado" BOOLEAN NOT NULL DEFAULT false,
    "cartaGerada" BOOLEAN NOT NULL DEFAULT false,
    "entrevistaMotivo" TEXT,
    "entrevistaObs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_entityType_entityId_idx" ON "audit_events"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "recruitment_jobs_tenantId_idx" ON "recruitment_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "candidates_tenantId_jobId_idx" ON "candidates"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "candidate_pool_entries_tenantId_type_idx" ON "candidate_pool_entries"("tenantId", "type");

-- CreateIndex
CREATE INDEX "job_costs_tenantId_jobId_idx" ON "job_costs"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "job_requisitions_tenantId_idx" ON "job_requisitions"("tenantId");

-- CreateIndex
CREATE INDEX "scheduled_interviews_tenantId_jobId_idx" ON "scheduled_interviews"("tenantId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_item_defs_tenantId_scope_filial_key_key" ON "checklist_item_defs"("tenantId", "scope", "filial", "key");

-- CreateIndex
CREATE INDEX "admissions_tenantId_idx" ON "admissions"("tenantId");

-- CreateIndex
CREATE INDEX "employees_tenantId_idx" ON "employees"("tenantId");

-- CreateIndex
CREATE INDEX "historico_eventos_employeeId_idx" ON "historico_eventos"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documentos_employeeId_idx" ON "employee_documentos"("employeeId");

-- CreateIndex
CREATE INDEX "evaluation_cycles_tenantId_idx" ON "evaluation_cycles"("tenantId");

-- CreateIndex
CREATE INDEX "evaluation_records_tenantId_idx" ON "evaluation_records"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_records_cycleId_employeeId_key" ON "evaluation_records"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "goals_tenantId_cycleId_idx" ON "goals"("tenantId", "cycleId");

-- CreateIndex
CREATE INDEX "pdi_actions_tenantId_employeeId_idx" ON "pdi_actions"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "vacation_requests_tenantId_employeeId_idx" ON "vacation_requests"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "leave_records_tenantId_employeeId_idx" ON "leave_records"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "termination_checklist_defs_tenantId_key_key" ON "termination_checklist_defs"("tenantId", "key");

-- CreateIndex
CREATE INDEX "terminations_tenantId_idx" ON "terminations"("tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_jobs" ADD CONSTRAINT "recruitment_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "recruitment_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pool_entries" ADD CONSTRAINT "candidate_pool_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_costs" ADD CONSTRAINT "job_costs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "recruitment_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_interviews" ADD CONSTRAINT "scheduled_interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "recruitment_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_interviews" ADD CONSTRAINT "scheduled_interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_interviews" ADD CONSTRAINT "scheduled_interviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_defs" ADD CONSTRAINT "checklist_item_defs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependentes" ADD CONSTRAINT "dependentes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_eventos" ADD CONSTRAINT "historico_eventos_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documentos" ADD CONSTRAINT "employee_documentos_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferias_historico" ADD CONSTRAINT "ferias_historico_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_cycles" ADD CONSTRAINT "evaluation_cycles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_records" ADD CONSTRAINT "evaluation_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_records" ADD CONSTRAINT "evaluation_records_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "evaluation_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_records" ADD CONSTRAINT "evaluation_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "evaluation_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdi_actions" ADD CONSTRAINT "pdi_actions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdi_actions" ADD CONSTRAINT "pdi_actions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termination_checklist_defs" ADD CONSTRAINT "termination_checklist_defs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
