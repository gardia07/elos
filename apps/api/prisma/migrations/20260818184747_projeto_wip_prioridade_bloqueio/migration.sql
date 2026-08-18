-- CreateEnum
CREATE TYPE "agenda_item_prioridade" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "bloqueadoPorId" UUID,
ADD COLUMN     "prioridade" "agenda_item_prioridade";

-- AlterTable
ALTER TABLE "projetos" ADD COLUMN     "wipLimiteEmAndamento" INTEGER;

-- CreateIndex
CREATE INDEX "agenda_items_bloqueadoPorId_idx" ON "agenda_items"("bloqueadoPorId");

-- AddForeignKey
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_bloqueadoPorId_fkey" FOREIGN KEY ("bloqueadoPorId") REFERENCES "agenda_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
