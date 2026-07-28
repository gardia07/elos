-- CreateEnum
CREATE TYPE "tipo_salario" AS ENUM ('MENSALISTA', 'HORISTA', 'DIARISTA');

-- AlterEnum
ALTER TYPE "job_contrato" ADD VALUE 'INTERMITENTE';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "tipoSalario" "tipo_salario" NOT NULL DEFAULT 'MENSALISTA';
