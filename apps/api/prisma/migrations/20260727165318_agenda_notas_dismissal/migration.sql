-- AlterTable
ALTER TABLE "agenda_items" ADD COLUMN     "notas" TEXT;

-- CreateTable
CREATE TABLE "agenda_dismissals" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "origem" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agenda_dismissals_tenantId_userId_origem_sourceId_key" ON "agenda_dismissals"("tenantId", "userId", "origem", "sourceId");

-- AddForeignKey
ALTER TABLE "agenda_dismissals" ADD CONSTRAINT "agenda_dismissals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
