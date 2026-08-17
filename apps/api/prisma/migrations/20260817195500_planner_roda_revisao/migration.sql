-- CreateTable
CREATE TABLE "roda_da_vida_avaliacoes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "carreira" INTEGER NOT NULL,
    "financas" INTEGER NOT NULL,
    "saude" INTEGER NOT NULL,
    "familiaAmigos" INTEGER NOT NULL,
    "relacionamento" INTEGER NOT NULL,
    "crescimentoPessoal" INTEGER NOT NULL,
    "lazer" INTEGER NOT NULL,
    "ambienteFisico" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roda_da_vida_avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisoes_mensais" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "intencoes" TEXT,
    "oQueFuncionou" TEXT,
    "oQueNaoFuncionou" TEXT,
    "oQuePrecisaMudar" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisoes_mensais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roda_da_vida_avaliacoes_tenantId_userId_data_key" ON "roda_da_vida_avaliacoes"("tenantId", "userId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "revisoes_mensais_tenantId_userId_ano_mes_key" ON "revisoes_mensais"("tenantId", "userId", "ano", "mes");

-- AddForeignKey
ALTER TABLE "roda_da_vida_avaliacoes" ADD CONSTRAINT "roda_da_vida_avaliacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_mensais" ADD CONSTRAINT "revisoes_mensais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
