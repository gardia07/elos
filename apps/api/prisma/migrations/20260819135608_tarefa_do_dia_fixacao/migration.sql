-- CreateTable
CREATE TABLE "tarefas_do_dia_fixacoes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "origem" TEXT NOT NULL,
    "origemId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_do_dia_fixacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarefas_do_dia_fixacoes_tenantId_userId_idx" ON "tarefas_do_dia_fixacoes"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_do_dia_fixacoes_tenantId_userId_origem_origemId_key" ON "tarefas_do_dia_fixacoes"("tenantId", "userId", "origem", "origemId");

-- AddForeignKey
ALTER TABLE "tarefas_do_dia_fixacoes" ADD CONSTRAINT "tarefas_do_dia_fixacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
