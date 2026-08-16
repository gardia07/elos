-- CreateTable
CREATE TABLE "agenda_lembretes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agendaItemId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "antecedenciaDias" INTEGER NOT NULL,
    "notificarEmail" BOOLEAN NOT NULL DEFAULT false,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_notificacoes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "agendaItemId" UUID,
    "titulo" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_lembretes_tenantId_enviado_idx" ON "agenda_lembretes"("tenantId", "enviado");

-- CreateIndex
CREATE INDEX "agenda_notificacoes_tenantId_userId_lida_idx" ON "agenda_notificacoes"("tenantId", "userId", "lida");

-- AddForeignKey
ALTER TABLE "agenda_lembretes" ADD CONSTRAINT "agenda_lembretes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_lembretes" ADD CONSTRAINT "agenda_lembretes_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_notificacoes" ADD CONSTRAINT "agenda_notificacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
