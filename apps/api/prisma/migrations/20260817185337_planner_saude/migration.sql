-- CreateTable
CREATE TABLE "humor_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "nivel" INTEGER NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "humor_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclo_menstrual_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dataInicio" DATE NOT NULL,
    "duracaoDias" INTEGER,
    "sintomas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciclo_menstrual_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peso_medida_registros" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "pesoKg" DECIMAL(5,2),
    "cinturaCm" DECIMAL(5,2),
    "quadrilCm" DECIMAL(5,2),
    "bracoCm" DECIMAL(5,2),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peso_medida_registros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "humor_registros_tenantId_userId_data_key" ON "humor_registros"("tenantId", "userId", "data");

-- CreateIndex
CREATE INDEX "ciclo_menstrual_registros_tenantId_userId_idx" ON "ciclo_menstrual_registros"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "peso_medida_registros_tenantId_userId_data_key" ON "peso_medida_registros"("tenantId", "userId", "data");

-- AddForeignKey
ALTER TABLE "humor_registros" ADD CONSTRAINT "humor_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_menstrual_registros" ADD CONSTRAINT "ciclo_menstrual_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peso_medida_registros" ADD CONSTRAINT "peso_medida_registros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
