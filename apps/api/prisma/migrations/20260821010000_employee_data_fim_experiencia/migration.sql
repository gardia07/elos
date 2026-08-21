-- Data de fim do período de experiência (CLT) -- preenchida pelo RH na
-- admissão/edição, usada pelo Motor de Risco para detectar contrato de
-- experiência vencido sem formalização (efetivação ou desligamento).
ALTER TABLE "employees" ADD COLUMN "dataFimExperiencia" DATE;
