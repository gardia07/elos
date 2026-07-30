/*
  Warnings:

  - You are about to drop the column `entrevistaMotivo` on the `terminations` table. All the data in the column will be lost.
  - You are about to drop the column `entrevistaObs` on the `terminations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "terminations" DROP COLUMN "entrevistaMotivo",
DROP COLUMN "entrevistaObs",
ADD COLUMN     "entrevistaDesligamento" JSONB;
