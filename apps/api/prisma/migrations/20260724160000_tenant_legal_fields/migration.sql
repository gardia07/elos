CREATE TYPE "regime_tributario" AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

ALTER TABLE "tenants"
  ADD COLUMN "inscricaoEstadual" TEXT,
  ADD COLUMN "inscricaoMunicipal" TEXT,
  ADD COLUMN "cnae" TEXT,
  ADD COLUMN "regimeTributario" "regime_tributario",
  ADD COLUMN "cep" TEXT,
  ADD COLUMN "logradouro" TEXT,
  ADD COLUMN "numero" TEXT,
  ADD COLUMN "complemento" TEXT,
  ADD COLUMN "bairro" TEXT,
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "uf" TEXT,
  ADD COLUMN "representanteLegalNome" TEXT,
  ADD COLUMN "representanteLegalCpf" TEXT,
  ADD COLUMN "representanteLegalCargo" TEXT;
