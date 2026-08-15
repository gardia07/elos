-- CreateTable
CREATE TABLE "agenda_revisoes_diarias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "reflexao" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_revisoes_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agenda_revisoes_diarias_tenantId_userId_data_key" ON "agenda_revisoes_diarias"("tenantId", "userId", "data");

-- AddForeignKey
ALTER TABLE "agenda_revisoes_diarias" ADD CONSTRAINT "agenda_revisoes_diarias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
