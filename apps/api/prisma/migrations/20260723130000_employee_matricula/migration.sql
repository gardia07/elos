-- Add matricula (employee registration number), backfilled sequentially
-- per tenant for existing rows, then made required + unique per tenant.

ALTER TABLE "employees" ADD COLUMN "matricula" TEXT;

UPDATE "employees" e
SET "matricula" = LPAD(sub.rn::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt") AS rn
  FROM "employees"
) sub
WHERE e.id = sub.id;

ALTER TABLE "employees" ALTER COLUMN "matricula" SET NOT NULL;

CREATE UNIQUE INDEX "employees_tenantId_matricula_key" ON "employees"("tenantId", "matricula");
