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

    let coberturaMedia = 100;
    if (politicas.length > 0) {
      const coberturas = await Promise.all(
        politicas.map(async (p) => {
          const aceites = await db.policyAcknowledgment.count({ where: { policyId: p.id } });
          return totalAtivos ? (100 * aceites) / totalAtivos : 100;
        }),
      );
      coberturaMedia = Math.round(coberturas.reduce((a, b) => a + b, 0) / coberturas.length);
    }

    const taxaResolucao = totalCasos ? (100 * casosConcluidos) / totalCasos : 100;
    // Índice simplificado: média entre cobertura de políticas e taxa de
    // resolução de casos — não substitui um framework formal de maturidade.
    const maturidade = Math.round((coberturaMedia + taxaResolucao) / 2);

    return {
      maturidade,
      casosAbertos,
      casosConcluidosMes,
      politicasAtivas: politicas.length,
      coberturaMediaPoliticas: coberturaMedia,
    };
  }
}
