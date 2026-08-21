-- CreateEnum
CREATE TYPE "natureza_afastamento" AS ENUM ('OCUPACIONAL', 'NAO_OCUPACIONAL');

-- AlterEnum
ALTER TYPE "tipo_evento_colaborador" ADD VALUE 'AFASTAMENTO_RECAIDA_15_DIAS';

-- AlterTable
ALTER TABLE "leave_records" ADD COLUMN     "accidentId" UUID,
ADD COLUMN     "cid" TEXT,
ADD COLUMN     "cidDescricao" TEXT,
ADD COLUMN     "dataFimPrevista" DATE,
ADD COLUMN     "episodioId" UUID,
ADD COLUMN     "medicoCrm" TEXT,
ADD COLUMN     "medicoNome" TEXT,
ADD COLUMN     "motivoAfastamentoId" UUID;

-- CreateTable
CREATE TABLE "motivos_afastamento" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "codigoEsocial" TEXT,
    "descricao" TEXT NOT NULL,
    "natureza" "natureza_afastamento" NOT NULL,
    "exigeCid" BOOLEAN NOT NULL DEFAULT true,
    "geraEstabilidade" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motivos_afastamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afastamento_episodios" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "cid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "afastamento_episodios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "motivos_afastamento_tenantId_idx" ON "motivos_afastamento"("tenantId");

-- CreateIndex
CREATE INDEX "afastamento_episodios_tenantId_employeeId_cid_idx" ON "afastamento_episodios"("tenantId", "employeeId", "cid");

-- CreateIndex
CREATE INDEX "leave_records_episodioId_idx" ON "leave_records"("episodioId");

-- AddForeignKey
ALTER TABLE "motivos_afastamento" ADD CONSTRAINT "motivos_afastamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "afastamento_episodios" ADD CONSTRAINT "afastamento_episodios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "afastamento_episodios" ADD CONSTRAINT "afastamento_episodios_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_motivoAfastamentoId_fkey" FOREIGN KEY ("motivoAfastamentoId") REFERENCES "motivos_afastamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_episodioId_fkey" FOREIGN KEY ("episodioId") REFERENCES "afastamento_episodios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_accidentId_fkey" FOREIGN KEY ("accidentId") REFERENCES "accidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

