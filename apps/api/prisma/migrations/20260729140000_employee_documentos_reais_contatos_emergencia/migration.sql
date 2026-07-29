-- AlterTable
ALTER TABLE "employee_document_requirements" ADD COLUMN     "blobPathname" TEXT,
ADD COLUMN     "contentType" TEXT;

-- AlterTable
ALTER TABLE "employee_documentos" ADD COLUMN     "blobPathname" TEXT,
ADD COLUMN     "contentType" TEXT;

-- CreateTable
CREATE TABLE "contatos_emergencia" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "telefone" TEXT,

    CONSTRAINT "contatos_emergencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contatos_emergencia" ADD CONSTRAINT "contatos_emergencia_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migra o contato de emergência único (nome/telefone) já cadastrado para a nova
-- tabela de múltiplos contatos, antes de derrubar as colunas antigas. Parentesco fica em
-- branco porque não existia campo equivalente antes.
INSERT INTO "contatos_emergencia" (id, "employeeId", nome, parentesco, telefone)
SELECT gen_random_uuid(), id, "contatoEmergenciaNome", '', "contatoEmergenciaTelefone"
FROM "employees"
WHERE "contatoEmergenciaNome" IS NOT NULL AND "contatoEmergenciaNome" <> '';

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "contatoEmergenciaNome",
DROP COLUMN "contatoEmergenciaTelefone",
ADD COLUMN     "semDependentes" BOOLEAN NOT NULL DEFAULT false;
