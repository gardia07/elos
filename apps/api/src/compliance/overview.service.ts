import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComplianceOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async get() {
    const db = this.db();
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [casosAbertos, casosConcluidosMes, totalCasos, casosConcluidos, politicas, totalAtivos] = await Promise.all([
      db.ethicsCase.count({ where: { status: { in: ['ABERTO', 'EM_INVESTIGACAO'] } } }),
      db.ethicsCase.count({ where: { status: 'CONCLUIDO', updatedAt: { gte: inicioMes } } }),
      db.ethicsCase.count(),
      db.ethicsCase.count({ where: { status: 'CONCLUIDO' } }),
      db.compliancePolicy.findMany({ where: { ativo: true } }),
      db.employee.count({ where: { status: 'ATIVO' } }),
    ]);

    // Sem políticas ativas ou sem colaboradores para aceitar = nada foi
    // verificado ainda, não "totalmente coberto" — 0, não 100.
    let coberturaMedia = 0;
    let politicasAceitesTotais = 0;
    const politicasItensAuditaveis = politicas.length * totalAtivos;
    if (politicas.length > 0) {
      const aceitesPorPolitica = await Promise.all(
        politicas.map((p) => db.policyAcknowledgment.count({ where: { policyId: p.id } })),
      );
      politicasAceitesTotais = aceitesPorPolitica.reduce((a, b) => a + b, 0);
      const coberturas = aceitesPorPolitica.map((aceites) => (totalAtivos ? (100 * aceites) / totalAtivos : 0));
      coberturaMedia = Math.round(coberturas.reduce((a, b) => a + b, 0) / coberturas.length);
    }

    // Idem: nenhum caso de ética registrado ainda não é o mesmo que "100%
    // resolvido" — é simplesmente não verificável, então conta como 0.
    const taxaResolucao = totalCasos ? (100 * casosConcluidos) / totalCasos : 0;
    // Índice simplificado: média entre cobertura de políticas e taxa de
    // resolução de casos — não substitui um framework formal de maturidade.
    const maturidade = Math.round((coberturaMedia + taxaResolucao) / 2);

    return {
      maturidade,
      casosAbertos,
      casosConcluidosMes,
      politicasAtivas: politicas.length,
      coberturaMediaPoliticas: coberturaMedia,
      // Itens auditáveis "brutos", pra Conformidade Geral do painel poder somar
      // uma única razão ponderada (itens conformes / itens auditáveis) em vez
      // de fazer média de percentuais de populações de tamanhos diferentes.
      itensAuditaveis: politicasItensAuditaveis + totalCasos,
      itensConformes: politicasAceitesTotais + casosConcluidos,
    };
  }
}
