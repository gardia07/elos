-- CreateEnum
CREATE TYPE "AtalhoExternoTipo" AS ENUM ('LINK_SIMPLES', 'WIDGET_VIVO');

-- CreateTable
CREATE TABLE "atalhos_externos" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "tipo" "AtalhoExternoTipo" NOT NULL DEFAULT 'LINK_SIMPLES',
    "statusConexao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atalhos_externos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "atalhos_externos_tenantId_idx" ON "atalhos_externos"("tenantId");

-- AddForeignKey
ALTER TABLE "atalhos_externos" ADD CONSTRAINT "atalhos_externos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
