-- CreateEnum
CREATE TYPE "ProjetoStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_RISCO', 'CANCELADO');

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "projetoId" UUID;

-- CreateTable
CREATE TABLE "projetos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "status" "ProjetoStatus" NOT NULL DEFAULT 'PLANEJADO',
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "criadoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto_participantes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projetoId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projeto_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projetos_tenantId_idx" ON "projetos"("tenantId");

-- CreateIndex
CREATE INDEX "projeto_participantes_tenantId_userId_idx" ON "projeto_participantes"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "projeto_participantes_projetoId_userId_key" ON "projeto_participantes"("projetoId", "userId");

-- CreateIndex
CREATE INDEX "agenda_items_projetoId_idx" ON "agenda_items"("projetoId");

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_participantes" ADD CONSTRAINT "projeto_participantes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_participantes" ADD CONSTRAINT "projeto_participantes_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
