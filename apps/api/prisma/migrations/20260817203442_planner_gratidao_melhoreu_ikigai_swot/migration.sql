-- AlterTable
ALTER TABLE "humor_registros" ADD COLUMN     "gratidao1" TEXT,
ADD COLUMN     "gratidao2" TEXT,
ADD COLUMN     "gratidao3" TEXT;

-- CreateTable
CREATE TABLE "melhor_eu_possivel_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "melhor_eu_possivel_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ikigai_avaliacoes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "oQueAma" TEXT,
    "noQueEBom" TEXT,
    "oMundoPrecisa" TEXT,
    "peloQuePodeSerPago" TEXT,
    "sintese" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ikigai_avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swot_pessoal_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "forcas" TEXT,
    "fraquezas" TEXT,
    "oportunidades" TEXT,
    "ameacas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swot_pessoal_registros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "melhor_eu_possivel_registros_tenantId_userId_data_key" ON "melhor_eu_possivel_registros"("tenantId", "userId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "ikigai_avaliacoes_tenantId_userId_data_key" ON "ikigai_avaliacoes"("tenantId", "userId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "swot_pessoal_registros_tenantId_userId_data_key" ON "swot_pessoal_registros"("tenantId", "userId", "data");

-- AddForeignKey
ALTER TABLE "melhor_eu_possivel_registros" ADD CONSTRAINT "melhor_eu_possivel_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ikigai_avaliacoes" ADD CONSTRAINT "ikigai_avaliacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swot_pessoal_registros" ADD CONSTRAINT "swot_pessoal_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
