/*
  Warnings:

  - You are about to drop the column `intencoes` on the `revisoes_mensais` table. All the data in the column will be lost.
  - You are about to drop the column `oQueFuncionou` on the `revisoes_mensais` table. All the data in the column will be lost.
  - You are about to drop the column `oQuePrecisaMudar` on the `revisoes_mensais` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "revisoes_mensais" DROP COLUMN "intencoes",
DROP COLUMN "oQueFuncionou",
DROP COLUMN "oQuePrecisaMudar",
ADD COLUMN     "conquistas" TEXT,
ADD COLUMN     "desejo" TEXT,
ADD COLUMN     "obstaculo" TEXT,
ADD COLUMN     "plano" TEXT,
ADD COLUMN     "proximoPasso" TEXT,
ADD COLUMN     "resultado" TEXT,
ADD COLUMN     "satisfacao" INTEGER;
