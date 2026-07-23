import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateExamDto, RegisterResultDto } from './dto/exams.dto';

const VENCENDO_WINDOW_DAYS = 15;

function computeStatus(dataPrevista: Date, resultado: string | null, hoje: Date): string {
  if (resultado) return 'Concluído';
  const diffDias = Math.round((dataPrevista.getTime() - hoje.getTime()) / 86_400_000);
  if (diffDias < 0) return 'Atrasado';
  if (diffDias <= VENCENDO_WINDOW_DAYS) return 'Vencendo';
  return 'Agendado';
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const exams = await this.db().occupationalExam.findMany({
      orderBy: { dataPrevista: 'asc' },
      include: { employee: { select: { nome: true } } },
    });
    const hoje = new Date();
    return exams.map((e) => ({ ...e, status: computeStatus(e.dataPrevista, e.resultado, hoje) }));
  }

  async get(id: string) {
    const exam = await this.db().occupationalExam.findUnique({
      where: { id },
      include: { employee: { select: { id: true, nome: true } } },
    });
    if (!exam) throw new NotFoundException('Exame não encontrado.');
    const auditLog = await this.audit.listForEntity('occupational_exam', id);
    return { ...exam, status: computeStatus(exam.dataPrevista, exam.resultado, new Date()), auditLog };
  }

  async kpis() {
    const exams = await this.db().occupationalExam.findMany();
    const hoje = new Date();
    const total = exams.length || 1;
    const emDia = exams.filter((e) => computeStatus(e.dataPrevista, e.resultado, hoje) !== 'Atrasado').length;
    return { emDiaPct: Math.round((emDia / total) * 100), total: exams.length };
  }

  async create(dto: CreateExamDto) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const exam = await db.occupationalExam.create({
      data: {
        tenantId: getRequestContext().tenantId,
        employeeId: dto.employeeId,
        cargo: employee.cargo,
        tipo: dto.tipo,
        dataPrevista: new Date(dto.dataPrevista),
      },
    });
    await this.audit.log('occupational_exam', exam.id, 'agendado');
    return exam;
  }

  async registerResult(id: string, dto: RegisterResultDto) {
    const exam = await this.mustFind(id);
    if (exam.resultado) throw new BadRequestException('Resultado já registrado para este exame.');
    const updated = await this.db().occupationalExam.update({
      where: { id },
      data: { dataRealizada: new Date(), resultado: dto.resultado },
    });
    await this.audit.log('occupational_exam', id, `resultado_registrado_${dto.resultado.toLowerCase()}`);
    return updated;
  }

  async sendEsocial(id: string) {
    await this.mustFind(id);
    const updated = await this.db().occupationalExam.update({ where: { id }, data: { esocialSent: true } });
    await this.audit.log('occupational_exam', id, 'esocial_s2220_enviado');
    return updated;
  }

  private async mustFind(id: string) {
    const exam = await this.db().occupationalExam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exame não encontrado.');
    return exam;
  }
}
