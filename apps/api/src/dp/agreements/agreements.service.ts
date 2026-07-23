import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { ApplyReajusteDto, CreateAgreementDto } from './dto/agreements.dto';

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().collectiveAgreement.findMany({ orderBy: { vigenciaFim: 'desc' } });
  }

  create(dto: CreateAgreementDto) {
    return this.db().collectiveAgreement.create({
      data: {
        sindicato: dto.sindicato,
        vigenciaInicio: new Date(dto.vigenciaInicio),
        vigenciaFim: new Date(dto.vigenciaFim),
        reajustePercentual: dto.reajustePercentual,
        clausulas: dto.clausulas,
        tenantId: getRequestContext().tenantId,
      },
    });
  }

  /**
   * Bumps active employees' salário by the agreement's reajustePercentual,
   * optionally scoped to one departamento. Real propagation the prototype
   * never implemented (its CCT "clausulas" text was decorative only).
   */
  async applyReajuste(id: string, dto: ApplyReajusteDto) {
    const db = this.db();
    const agreement = await db.collectiveAgreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('Convenção não encontrada.');
    if (agreement.reajusteAplicadoEm) throw new BadRequestException('Reajuste já aplicado para esta convenção.');

    const employees = await db.employee.findMany({
      where: { status: 'ATIVO', ...(dto.departamento ? { departamento: dto.departamento } : {}) },
    });

    const pct = Number(agreement.reajustePercentual);
    const { userName } = getRequestContext();
    let updated = 0;
    for (const e of employees) {
      const novoSalario = Number(e.salario) * (1 + pct / 100);
      await db.employee.update({ where: { id: e.id }, data: { salario: novoSalario.toFixed(2) } });
      await db.historicoEvento.create({
        data: {
          employeeId: e.id,
          evento: `Reajuste salarial de ${pct}% (CCT ${agreement.sindicato})`,
          categoria: 'Promoção',
          autor: userName,
        },
      });
      updated++;
    }

    await db.collectiveAgreement.update({ where: { id }, data: { reajusteAplicadoEm: new Date() } });
    await this.audit.log('collective_agreement', id, 'reajuste_aplicado', { pct, departamento: dto.departamento, updated });

    return { updated };
  }
}
