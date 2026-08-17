import type { TenantScopedPrisma } from '../prisma/prisma.service';

/**
 * Um item de agenda é visível pra quem criou, quem é o responsável, ou quem
 * participa do projeto ao qual o item pertence (projetos são compartilhados
 * entre todos os participantes, mesmo de equipes diferentes). Usado tanto em
 * agenda.service.ts quanto em ferramentas/agenda-geral/agenda-geral.service.ts
 * — mesma regra de visibilidade nos dois lugares.
 */
export async function itemVisivelPara(db: TenantScopedPrisma, userId: string) {
  const participacoes = await db.projetoParticipante.findMany({ where: { userId }, select: { projetoId: true } });
  const projetoIds = participacoes.map((p) => p.projetoId);
  return {
    OR: [{ userId }, { responsavelId: userId }, ...(projetoIds.length > 0 ? [{ projetoId: { in: projetoIds } }] : [])],
  };
}
