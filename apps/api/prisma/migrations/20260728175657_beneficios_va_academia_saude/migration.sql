/*
  Warnings:

  - You are about to drop the `benefit_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `benefits` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "beneficio_categoria" AS ENUM ('ALIMENTACAO', 'ACADEMIA', 'SAUDE');

-- CreateEnum
CREATE TYPE "feriado_abrangencia" AS ENUM ('NACIONAL', 'ESTADUAL', 'MUNICIPAL');

-- DropForeignKey
ALTER TABLE "benefit_enrollments" DROP CONSTRAINT "benefit_enrollments_benefitId_fkey";

-- DropForeignKey
ALTER TABLE "benefit_enrollments" DROP CONSTRAINT "benefit_enrollments_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "benefit_enrollments" DROP CONSTRAINT "benefit_enrollments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "benefits" DROP CONSTRAINT "benefits_tenantId_fkey";

-- DropTable
DROP TABLE "benefit_enrollments";

-- DropTable
DROP TABLE "benefits";

-- CreateTable
CREATE TABLE "beneficio_tipos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "beneficio_categoria" NOT NULL,

    CONSTRAINT "beneficio_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coparticipacao_regras" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "beneficioTipoId" UUID NOT NULL,
    "percentualEmpresa" DECIMAL(5,2) NOT NULL,
    "percentualColab" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "coparticipacao_regras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convenios_academia" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "valorMensalidade" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "convenios_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_saude" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "operadora" TEXT,

    CONSTRAINT "planos_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_saude_faixas_etarias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "planoId" UUID NOT NULL,
    "idadeMin" INTEGER NOT NULL,
    "idadeMax" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "plano_saude_faixas_etarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriados" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "abrangencia" "feriado_abrangencia" NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT,
    "municipioIbge" TEXT,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adesoes_vale_diario" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "beneficioTipoId" UUID NOT NULL,
    "valorDiario" DECIMAL(10,2) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,

    CONSTRAINT "adesoes_vale_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adesoes_academia" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "convenioId" UUID NOT NULL,
    "dataAdesao" DATE NOT NULL,
    "dataCancelamento" DATE,

    CONSTRAINT "adesoes_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adesoes_plano_saude" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "planoId" UUID NOT NULL,
    "dataAdesao" DATE NOT NULL,
    "dataCancelamento" DATE,

    CONSTRAINT "adesoes_plano_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependentes_plano_saude" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "adesaoId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATE NOT NULL,
    "parentesco" TEXT,

    CONSTRAINT "dependentes_plano_saude_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "beneficio_tipos_tenantId_idx" ON "beneficio_tipos"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficio_tipos_tenantId_nome_key" ON "beneficio_tipos"("tenantId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "coparticipacao_regras_beneficioTipoId_key" ON "coparticipacao_regras"("beneficioTipoId");

-- CreateIndex
CREATE INDEX "coparticipacao_regras_tenantId_idx" ON "coparticipacao_regras"("tenantId");

-- CreateIndex
CREATE INDEX "convenios_academia_tenantId_idx" ON "convenios_academia"("tenantId");

-- CreateIndex
CREATE INDEX "planos_saude_tenantId_idx" ON "planos_saude"("tenantId");

-- CreateIndex
CREATE INDEX "plano_saude_faixas_etarias_tenantId_idx" ON "plano_saude_faixas_etarias"("tenantId");

-- CreateIndex
CREATE INDEX "plano_saude_faixas_etarias_planoId_idx" ON "plano_saude_faixas_etarias"("planoId");

-- CreateIndex
CREATE INDEX "feriados_tenantId_idx" ON "feriados"("tenantId");

-- CreateIndex
CREATE INDEX "adesoes_vale_diario_tenantId_idx" ON "adesoes_vale_diario"("tenantId");

-- CreateIndex
CREATE INDEX "adesoes_vale_diario_employeeId_idx" ON "adesoes_vale_diario"("employeeId");

-- CreateIndex
CREATE INDEX "adesoes_academia_tenantId_idx" ON "adesoes_academia"("tenantId");

-- CreateIndex
CREATE INDEX "adesoes_academia_employeeId_idx" ON "adesoes_academia"("employeeId");

-- CreateIndex
CREATE INDEX "adesoes_plano_saude_tenantId_idx" ON "adesoes_plano_saude"("tenantId");

-- CreateIndex
CREATE INDEX "adesoes_plano_saude_employeeId_idx" ON "adesoes_plano_saude"("employeeId");

-- CreateIndex
CREATE INDEX "dependentes_plano_saude_tenantId_idx" ON "dependentes_plano_saude"("tenantId");

-- CreateIndex
CREATE INDEX "dependentes_plano_saude_adesaoId_idx" ON "dependentes_plano_saude"("adesaoId");

-- AddForeignKey
ALTER TABLE "beneficio_tipos" ADD CONSTRAINT "beneficio_tipos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coparticipacao_regras" ADD CONSTRAINT "coparticipacao_regras_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coparticipacao_regras" ADD CONSTRAINT "coparticipacao_regras_beneficioTipoId_fkey" FOREIGN KEY ("beneficioTipoId") REFERENCES "beneficio_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convenios_academia" ADD CONSTRAINT "convenios_academia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_saude" ADD CONSTRAINT "planos_saude_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_saude_faixas_etarias" ADD CONSTRAINT "plano_saude_faixas_etarias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_saude_faixas_etarias" ADD CONSTRAINT "plano_saude_faixas_etarias_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_saude"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feriados" ADD CONSTRAINT "feriados_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_vale_diario" ADD CONSTRAINT "adesoes_vale_diario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_vale_diario" ADD CONSTRAINT "adesoes_vale_diario_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_vale_diario" ADD CONSTRAINT "adesoes_vale_diario_beneficioTipoId_fkey" FOREIGN KEY ("beneficioTipoId") REFERENCES "beneficio_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_academia" ADD CONSTRAINT "adesoes_academia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_academia" ADD CONSTRAINT "adesoes_academia_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_academia" ADD CONSTRAINT "adesoes_academia_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "convenios_academia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_plano_saude" ADD CONSTRAINT "adesoes_plano_saude_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_plano_saude" ADD CONSTRAINT "adesoes_plano_saude_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_plano_saude" ADD CONSTRAINT "adesoes_plano_saude_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_saude"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependentes_plano_saude" ADD CONSTRAINT "dependentes_plano_saude_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependentes_plano_saude" ADD CONSTRAINT "dependentes_plano_saude_adesaoId_fkey" FOREIGN KEY ("adesaoId") REFERENCES "adesoes_plano_saude"("id") ON DELETE CASCADE ON UPDATE CASCADE;
