-- CreateTable
CREATE TABLE "apuracoes_beneficios" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "beneficioTipoId" UUID NOT NULL,
    "competencia" TEXT NOT NULL,
    "valorEmpresa" DECIMAL(10,2) NOT NULL,
    "valorColaborador" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "detalhamento" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apuracoes_beneficios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apuracoes_beneficios_tenantId_competencia_idx" ON "apuracoes_beneficios"("tenantId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "apuracoes_beneficios_tenantId_employeeId_beneficioTipoId_co_key" ON "apuracoes_beneficios"("tenantId", "employeeId", "beneficioTipoId", "competencia");

-- AddForeignKey
ALTER TABLE "apuracoes_beneficios" ADD CONSTRAINT "apuracoes_beneficios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apuracoes_beneficios" ADD CONSTRAINT "apuracoes_beneficios_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apuracoes_beneficios" ADD CONSTRAINT "apuracoes_beneficios_beneficioTipoId_fkey" FOREIGN KEY ("beneficioTipoId") REFERENCES "beneficio_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
