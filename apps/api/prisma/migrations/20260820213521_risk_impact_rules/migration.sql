-- CreateEnum
CREATE TYPE "tipo_batida" AS ENUM ('ENTRADA', 'SAIDA', 'INTERVALO_INICIO', 'INTERVALO_FIM');

-- CreateEnum
CREATE TYPE "origem_batida" AS ENUM ('APP', 'WEB', 'MANUAL_RH');

-- CreateEnum
CREATE TYPE "tipo_ajuste_ponto" AS ENUM ('OMISSAO', 'CORRECAO_HORARIO', 'ABONO');

-- CreateEnum
CREATE TYPE "status_ajuste_ponto" AS ENUM ('PENDENTE', 'APROVADA', 'REPROVADA');

-- CreateTable
CREATE TABLE "jornadas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "diasSemana" INTEGER[],
    "entrada" TEXT NOT NULL,
    "saida" TEXT NOT NULL,
    "intervaloInicio" TEXT,
    "intervaloFim" TEXT,
    "toleranciaMinutos" INTEGER NOT NULL DEFAULT 5,
    "vigenciaDesde" DATE NOT NULL,
    "vigenciaAte" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batidas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "tipo" "tipo_batida" NOT NULL,
    "origem" "origem_batida" NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "nsr" INTEGER NOT NULL,
    "registradoPorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_ponto" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "tipoAjuste" "tipo_ajuste_ponto" NOT NULL,
    "horarioProposto" TIMESTAMP(3),
    "batidaOrigemId" UUID,
    "justificativa" TEXT NOT NULL,
    "status" "status_ajuste_ponto" NOT NULL DEFAULT 'PENDENTE',
    "solicitadoPorId" UUID,
    "aprovadoPorId" UUID,
    "dataAprovacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajustes_ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_digitais" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "senhaCriptografada" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "validade" DATE NOT NULL,
    "uploadEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_digitais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afd_geracoes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFim" DATE NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "nsrInicial" INTEGER NOT NULL,
    "nsrFinal" INTEGER NOT NULL,
    "geradoPorId" UUID,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "afd_geracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_impact_rules" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "impacto" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_impact_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jornadas_tenantId_employeeId_idx" ON "jornadas"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "batidas_tenantId_employeeId_dataHora_idx" ON "batidas"("tenantId", "employeeId", "dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "batidas_tenantId_nsr_key" ON "batidas"("tenantId", "nsr");

-- CreateIndex
CREATE INDEX "ajustes_ponto_tenantId_employeeId_idx" ON "ajustes_ponto"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "certificados_digitais_tenantId_idx" ON "certificados_digitais"("tenantId");

-- CreateIndex
CREATE INDEX "afd_geracoes_tenantId_idx" ON "afd_geracoes"("tenantId");

-- CreateIndex
CREATE INDEX "risk_impact_rules_tenantId_idx" ON "risk_impact_rules"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_impact_rules_tenantId_tipo_key" ON "risk_impact_rules"("tenantId", "tipo");

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batidas" ADD CONSTRAINT "batidas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batidas" ADD CONSTRAINT "batidas_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_ponto" ADD CONSTRAINT "ajustes_ponto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_ponto" ADD CONSTRAINT "ajustes_ponto_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_ponto" ADD CONSTRAINT "ajustes_ponto_batidaOrigemId_fkey" FOREIGN KEY ("batidaOrigemId") REFERENCES "batidas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_digitais" ADD CONSTRAINT "certificados_digitais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "afd_geracoes" ADD CONSTRAINT "afd_geracoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_impact_rules" ADD CONSTRAINT "risk_impact_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
