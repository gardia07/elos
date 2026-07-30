-- AlterEnum
-- Substitui a lista de categorias de CNH por um conjunto reduzido e oficial
-- (A/B/AB/C/AC/D/AD/E/AE). Nenhum colaborador cadastrado usa um valor removido
-- (verificado antes de aplicar), então o cast abaixo é seguro.
BEGIN;
CREATE TYPE "cnh_categoria_new" AS ENUM ('A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE');
ALTER TABLE "employees" ALTER COLUMN "cnhCategoria" TYPE "cnh_categoria_new" USING ("cnhCategoria"::text::"cnh_categoria_new");
ALTER TYPE "cnh_categoria" RENAME TO "cnh_categoria_old";
ALTER TYPE "cnh_categoria_new" RENAME TO "cnh_categoria";
DROP TYPE "cnh_categoria_old";
COMMIT;
