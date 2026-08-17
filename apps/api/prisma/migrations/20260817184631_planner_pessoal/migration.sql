-- CreateEnum
CREATE TYPE "FinancaPessoalTipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "metas_pessoais" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_pessoais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habitos_pessoais" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ano" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habitos_pessoais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habito_pessoal_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "habitoId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habito_pessoal_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financas_pessoais_categorias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ano" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "FinancaPessoalTipo" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financas_pessoais_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financas_pessoais_lancamentos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoriaId" UUID NOT NULL,
    "mes" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financas_pessoais_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metas_pessoais_tenantId_userId_ano_idx" ON "metas_pessoais"("tenantId", "userId", "ano");

-- CreateIndex
CREATE INDEX "habitos_pessoais_tenantId_userId_ano_idx" ON "habitos_pessoais"("tenantId", "userId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "habito_pessoal_registros_habitoId_data_key" ON "habito_pessoal_registros"("habitoId", "data");

-- CreateIndex
CREATE INDEX "financas_pessoais_categorias_tenantId_userId_ano_idx" ON "financas_pessoais_categorias"("tenantId", "userId", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "financas_pessoais_lancamentos_categoriaId_mes_key" ON "financas_pessoais_lancamentos"("categoriaId", "mes");

-- AddForeignKey
ALTER TABLE "metas_pessoais" ADD CONSTRAINT "metas_pessoais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habitos_pessoais" ADD CONSTRAINT "habitos_pessoais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habito_pessoal_registros" ADD CONSTRAINT "habito_pessoal_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habito_pessoal_registros" ADD CONSTRAINT "habito_pessoal_registros_habitoId_fkey" FOREIGN KEY ("habitoId") REFERENCES "habitos_pessoais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financas_pessoais_categorias" ADD CONSTRAINT "financas_pessoais_categorias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financas_pessoais_lancamentos" ADD CONSTRAINT "financas_pessoais_lancamentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financas_pessoais_lancamentos" ADD CONSTRAINT "financas_pessoais_lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "financas_pessoais_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
