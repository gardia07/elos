import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateRunDto } from './dto/payroll.dto';

const GUIDE_NAMES = ['FGTS Digital', 'DARF INSS', 'DCTFWeb', 'IRRF'];

/**
 * Simplified placeholder deduction — NOT a real INSS/IRRF tax-table
 * calculation. Real Brazilian payroll needs progressive INSS brackets, IRRF
 * brackets with dependents, FGTS 8% (employer-side, not a discount), etc.
 * This exists so proventos/descontos/líquido are at least derived from the
 * employee's actual salário instead of hardcoded, per the README's note
 * that folha must be idempotent/auditable rather than a UI toggle.
 */
function computeDescontos(proventos: number): number {
  return Math.round(proventos * 0.2 * 100) / 100;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listRuns() {
    return this.db().payrollRun.findMany({
      orderBy: { competencia: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  createRun(dto: CreateRunDto) {
    return this.db().payrollRun.create({ data: { competencia: dto.competencia, tenantId: getRequestContext().tenantId } });
  }

  async getRun(id: string) {
    const run = await this.db().payrollRun.findUnique({
      where: { id },
      include: {
        items: { include: { employee: { select: { nome: true } } } },
        guides: true,
      },
    });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    const totals = run.items.reduce(
      (acc, i) => ({
        proventos: acc.proventos + Number(i.proventos),
        descontos: acc.descontos + Number(i.descontos),
        liquido: acc.liquido + Number(i.liquido),
      }),
      { proventos: 0, descontos: 0, liquido: 0 },
    );

    return { ...run, totals };
  }

  /** Idempotent: safe to call again after reopening — upserts one item per active employee. */
  async process(id: string) {
    const db = this.db();
    const run = await db.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    const employees = await db.employee.findMany({ where: { status: 'ATIVO' } });
    for (const e of employees) {
      const proventos = Number(e.salario);
      const descontos = computeDescontos(proventos);
      const liquido = proventos - descontos;
      await db.payslipItem.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: id, employeeId: e.id } },
        create: { payrollRunId: id, employeeId: e.id, proventos, descontos, liquido, tenantId: getRequestContext().tenantId },
        update: { proventos, descontos, liquido },
      });
    }

    const existingGuides = await db.payrollGuide.count({ where: { payrollRunId: id } });
    if (existingGuides === 0) {
      for (const guia of GUIDE_NAMES) {
        await db.payrollGuide.create({ data: { payrollRunId: id, guia, tenantId: getRequestContext().tenantId } });
      }
    }

    const updated = await db.payrollRun.update({
      where: { id },
      data: { status: 'PROCESSADA', processedAt: new Date() },
    });
    await this.audit.log('payroll_run', id, 'processada', { colaboradores: employees.length });
    return updated;
  }

  async reopen(id: string) {
    const run = await this.db().payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');
    const updated = await this.db().payrollRun.update({ where: { id }, data: { status: 'ABERTO' } });
    await this.audit.log('payroll_run', id, 'reaberta');
    return updated;
  }

  async sendEsocial(id: string) {
    const run = await this.db().payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');
    if (run.status !== 'PROCESSADA') throw new BadRequestException('Processe a folha antes de enviar o eSocial.');
    const updated = await this.db().payrollRun.update({ where: { id }, data: { esocialSent: true } });
    await this.audit.log('payroll_run', id, 'esocial_s1200_enviado');
    return updated;
  }

  async generateGuide(guideId: string) {
    const db = this.db();
    const guide = await db.payrollGuide.findUnique({ where: { id: guideId }, include: { payrollRun: true } });
    if (!guide) throw new NotFoundException('Guia não encontrada.');
    if (guide.payrollRun.status !== 'PROCESSADA') throw new BadRequestException('Processe a folha antes de gerar guias.');
    const updated = await db.payrollGuide.update({ where: { id: guideId }, data: { status: 'GERADA' } });
    await this.audit.log('payroll_guide', guideId, 'gerada', { guia: guide.guia });
    return updated;
  }
}
