import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateBenefitDto, EnrollDto } from './dto/benefits.dto';

@Injectable()
export class BenefitsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const db = this.db();
    const [benefits, activeCount] = await Promise.all([
      db.benefit.findMany({ orderBy: { nome: 'asc' }, include: { _count: { select: { enrollments: true } } } }),
      db.employee.count({ where: { status: 'ATIVO' } }),
    ]);
    return benefits.map((b) => ({
      ...b,
      inscritos: b._count.enrollments,
      adesaoPct: activeCount ? Math.round((b._count.enrollments / activeCount) * 100) : 0,
      custoTotalMensal: Number(b.custoMensal) * b._count.enrollments,
    }));
  }

  create(dto: CreateBenefitDto) {
    return this.db().benefit.create({ data: { ...dto, tenantId: getRequestContext().tenantId } });
  }

  async enroll(benefitId: string, dto: EnrollDto) {
    const db = this.db();
    const benefit = await db.benefit.findUnique({ where: { id: benefitId } });
    if (!benefit) throw new NotFoundException('Benefício não encontrado.');
    return db.benefitEnrollment.upsert({
      where: { benefitId_employeeId: { benefitId, employeeId: dto.employeeId } },
      create: { benefitId, employeeId: dto.employeeId, tenantId: getRequestContext().tenantId },
      update: {},
    });
  }

  async unenroll(benefitId: string, employeeId: string) {
    await this.db().benefitEnrollment.deleteMany({ where: { benefitId, employeeId } });
    return { ok: true };
  }

  listEnrollments(benefitId: string) {
    return this.db().benefitEnrollment.findMany({
      where: { benefitId },
      include: { employee: { select: { id: true, nome: true, departamento: true } } },
    });
  }
}
