-- CreateEnum
CREATE TYPE "cnh_categoria" AS ENUM ('ACC', 'A', 'A1', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'BE', 'CE', 'C1E', 'DE', 'D1E');

-- CreateEnum
CREATE TYPE "tipo_conta_bancaria" AS ENUM ('CORRENTE', 'POUPANCA');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "agencia" TEXT,
ADD COLUMN     "banco" TEXT,
ADD COLUMN     "chavePix" TEXT,
ADD COLUMN     "cnhCategoria" "cnh_categoria",
ADD COLUMN     "cnhValidade" DATE,
ADD COLUMN     "conta" TEXT,
ADD COLUMN     "tipoConta" "tipo_conta_bancaria";

-- CreateTable
CREATE TABLE "cargo_salario_historico" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "vigenciaDesde" DATE NOT NULL,
    "cargo" TEXT NOT NULL,
    "salario" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "observacao" TEXT,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPor" TEXT NOT NULL,

    CONSTRAINT "cargo_salario_historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cargo_salario_historico_employeeId_idx" ON "cargo_salario_historico"("employeeId");

-- AddForeignKey
ALTER TABLE "cargo_salario_historico" ADD CONSTRAINT "cargo_salario_historico_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: uma linha por colaborador existente usando o estado atual (cargo/salario/data de
-- admissao) como ponto de partida da linha do tempo. Alteracoes anteriores a esta migracao nao
-- ficaram registradas de forma estruturada (so como texto livre em historico_eventos), entao este
-- e o melhor estado conhecido, nao um historico real.
INSERT INTO "cargo_salario_historico" (id, "employeeId", "vigenciaDesde", cargo, salario, motivo, observacao, "registradoEm", "registradoPor")
SELECT gen_random_uuid(), id, "dataAdmissao", cargo, salario, 'Cadastro inicial no sistema',
       'Gerado automaticamente nesta migracao — nao reflete alteracoes de cargo/salario anteriores a esta data.',
       now(), 'Sistema'
FROM "employees";
