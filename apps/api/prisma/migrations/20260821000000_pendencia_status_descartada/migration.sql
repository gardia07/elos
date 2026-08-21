-- Nova pendência que não se aplica de fato (condição adicional descartada
-- manualmente pelo responsável) precisa de um status próprio, neutro no
-- Índice de Conformidade, diferente de CONCLUIDA (resolvida de verdade) e
-- de VENCIDA (ainda pendente, só que fora do prazo).
ALTER TYPE "status_pendencia" ADD VALUE 'DESCARTADA';
