-- CreateEnum
CREATE TYPE "TarefaProjetoStatus" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "statusProjeto" "TarefaProjetoStatus" NOT NULL DEFAULT 'A_FAZER';

-- CreateTable
CREATE TABLE "agenda_item_subtarefas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agendaItemId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_item_subtarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto_marcos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projetoId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projeto_marcos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto_modelos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "criadoPorId" UUID NOT NULL,
    "tarefas" JSONB NOT NULL DEFAULT '[]',
    "marcos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projeto_modelos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_item_subtarefas_agendaItemId_idx" ON "agenda_item_subtarefas"("agendaItemId");

-- CreateIndex
CREATE INDEX "projeto_marcos_projetoId_idx" ON "projeto_marcos"("projetoId");

-- CreateIndex
CREATE INDEX "projeto_modelos_tenantId_idx" ON "projeto_modelos"("tenantId");

-- AddForeignKey
ALTER TABLE "agenda_item_subtarefas" ADD CONSTRAINT "agenda_item_subtarefas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_item_subtarefas" ADD CONSTRAINT "agenda_item_subtarefas_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_marcos" ADD CONSTRAINT "projeto_marcos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_marcos" ADD CONSTRAINT "projeto_marcos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_modelos" ADD CONSTRAINT "projeto_modelos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
