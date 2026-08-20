-- CreateEnum
CREATE TYPE "tipo_evento_colaborador" AS ENUM ('ADMISSAO', 'MUDANCA_CARGO_FUNCAO', 'MUDANCA_CARGA_HORARIA', 'MUDANCA_SALARIAL', 'INICIO_AFASTAMENTO', 'RETORNO_AFASTAMENTO', 'LICENCA_MATERNIDADE', 'TRANSFERENCIA_LOCAL', 'MUDANCA_REGIME_TRABALHO', 'ADVERTENCIA_SUSPENSAO', 'ASO_PERIODICO_VENCIDO', 'TREINAMENTO_NR_VENCIDO', 'DESLIGAMENTO');

-- CreateEnum
CREATE TYPE "origem_evento_colaborador" AS ENUM ('MANUAL', 'IMPORTACAO', 'INTEGRACAO_ESOCIAL');

-- CreateEnum
CREATE TYPE "categoria_tipo_documento" AS ENUM ('ADMISSIONAL', 'CONTRATUAL', 'SAUDE_OCUPACIONAL', 'RESCISORIO', 'AFASTAMENTO');

-- CreateEnum
CREATE TYPE "status_pendencia" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_ASSINATURA', 'CONCLUIDA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "tipo_alerta_conformidade" AS ENUM ('LEMBRETE', 'VENCIMENTO_PROXIMO', 'VENCIDA');

-- CreateEnum
CREATE TYPE "canal_alerta_conformidade" AS ENUM ('SISTEMA', 'EMAIL', 'WHATSAPP');

-- CreateTable
CREATE TABLE "eventos_colaborador" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "tipoEvento" "tipo_evento_colaborador" NOT NULL,
    "dataEvento" DATE NOT NULL,
    "dadosAnteriores" JSONB,
    "dadosNovos" JSONB,
    "origem" "origem_evento_colaborador" NOT NULL DEFAULT 'MANUAL',
    "usuarioResponsavelId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento_conformidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "categoria_tipo_documento" NOT NULL,
    "requerAssinaturaColaborador" BOOLEAN NOT NULL DEFAULT false,
    "requerAssinaturaEmpresa" BOOLEAN NOT NULL DEFAULT false,
    "validadeDias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_documento_conformidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras_conformidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tipoEventoGatilho" "tipo_evento_colaborador" NOT NULL,
    "condicaoAdicional" TEXT,
    "documentoExigidoId" UUID NOT NULL,
    "prazoDias" INTEGER NOT NULL,
    "bloqueante" BOOLEAN NOT NULL DEFAULT false,
    "baseLegal" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regras_conformidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencias_conformidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "eventoOrigemId" UUID NOT NULL,
    "regraId" UUID NOT NULL,
    "documentoId" UUID NOT NULL,
    "status" "status_pendencia" NOT NULL DEFAULT 'ABERTA',
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataLimite" DATE NOT NULL,
    "dataConclusao" TIMESTAMP(3),
    "anexoDocumentoId" UUID,
    "responsavelId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pendencias_conformidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_conformidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "pendenciaId" UUID NOT NULL,
    "tipo" "tipo_alerta_conformidade" NOT NULL,
    "dataDisparo" DATE NOT NULL,
    "canal" "canal_alerta_conformidade" NOT NULL DEFAULT 'SISTEMA',
    "disparadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_conformidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_colaborador_tenantId_employeeId_idx" ON "eventos_colaborador"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "tipos_documento_conformidade_tenantId_idx" ON "tipos_documento_conformidade"("tenantId");

-- CreateIndex
CREATE INDEX "regras_conformidade_tenantId_idx" ON "regras_conformidade"("tenantId");

-- CreateIndex
CREATE INDEX "regras_conformidade_tenantId_tipoEventoGatilho_idx" ON "regras_conformidade"("tenantId", "tipoEventoGatilho");

-- CreateIndex
CREATE INDEX "pendencias_conformidade_tenantId_employeeId_idx" ON "pendencias_conformidade"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "pendencias_conformidade_tenantId_status_idx" ON "pendencias_conformidade"("tenantId", "status");

-- CreateIndex
CREATE INDEX "alertas_conformidade_tenantId_idx" ON "alertas_conformidade"("tenantId");

-- CreateIndex
CREATE INDEX "alertas_conformidade_tenantId_dataDisparo_idx" ON "alertas_conformidade"("tenantId", "dataDisparo");

-- AddForeignKey
ALTER TABLE "eventos_colaborador" ADD CONSTRAINT "eventos_colaborador_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_colaborador" ADD CONSTRAINT "eventos_colaborador_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_documento_conformidade" ADD CONSTRAINT "tipos_documento_conformidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regras_conformidade" ADD CONSTRAINT "regras_conformidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regras_conformidade" ADD CONSTRAINT "regras_conformidade_documentoExigidoId_fkey" FOREIGN KEY ("documentoExigidoId") REFERENCES "tipos_documento_conformidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias_conformidade" ADD CONSTRAINT "pendencias_conformidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias_conformidade" ADD CONSTRAINT "pendencias_conformidade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias_conformidade" ADD CONSTRAINT "pendencias_conformidade_eventoOrigemId_fkey" FOREIGN KEY ("eventoOrigemId") REFERENCES "eventos_colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias_conformidade" ADD CONSTRAINT "pendencias_conformidade_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "regras_conformidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias_conformidade" ADD CONSTRAINT "pendencias_conformidade_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "tipos_documento_conformidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_conformidade" ADD CONSTRAINT "alertas_conformidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_conformidade" ADD CONSTRAINT "alertas_conformidade_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias_conformidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
