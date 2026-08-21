-- "anexoDocumentoId" nunca teve relação nem leitor (era um placeholder sem
-- uso real). Substituído pelos campos que de fato guardam o arquivo anexado
-- no Blob store, no mesmo padrão de EmployeeDocumentRequirement.
ALTER TABLE "pendencias_conformidade"
  DROP COLUMN "anexoDocumentoId",
  ADD COLUMN "anexoBlobPathname" TEXT,
  ADD COLUMN "anexoNomeArquivo" TEXT,
  ADD COLUMN "anexoContentType" TEXT;
