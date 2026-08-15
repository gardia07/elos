-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "responsavelId" UUID;

-- CreateTable
CREATE TABLE "agenda_comentarios" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agendaItemId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "autor" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_comentarios_tenantId_agendaItemId_idx" ON "agenda_comentarios"("tenantId", "agendaItemId");

-- CreateIndex
CREATE INDEX "agenda_items_responsavelId_idx" ON "agenda_items"("responsavelId");

-- AddForeignKey
ALTER TABLE "agenda_comentarios" ADD CONSTRAINT "agenda_comentarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_comentarios" ADD CONSTRAINT "agenda_comentarios_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
