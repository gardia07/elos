/*
  Warnings:

  - Added the required column `updatedAt` to the `time_justifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `vacation_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Existing rows get CURRENT_TIMESTAMP as their initial updatedAt (this
-- default is only for backfill; @updatedAt keeps rows fresh going forward).
ALTER TABLE "time_justifications" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "vacation_requests" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "metrica" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_tenantId_metrica_data_idx" ON "metric_snapshots"("tenantId", "metrica", "data");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_tenantId_metrica_data_key" ON "metric_snapshots"("tenantId", "metrica", "data");

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
