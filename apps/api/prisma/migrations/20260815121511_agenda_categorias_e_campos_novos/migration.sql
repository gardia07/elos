-- AlterEnum
ALTER TYPE "agenda_item_tipo" ADD VALUE 'LEMBRETE';

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "categoriaId" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "horaFim" TEXT;

-- CreateTable
CREATE TABLE "agenda_categorias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "corDark" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_categorias_tenantId_idx" ON "agenda_categorias"("tenantId");

-- AddForeignKey
ALTER TABLE "agenda_categorias" ADD CONSTRAINT "agenda_categorias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "agenda_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
