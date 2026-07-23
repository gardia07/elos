import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateJustificationDto } from './dto/timeclock.dto';

@Injectable()
export class TimeclockService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listJustifications() {
    return this.db().timeJustification.findMany({
      orderBy: { data: 'desc' },
      include: { employee: { select: { nome: true } } },
    });
  }

  async kpis() {
    const db = this.db();
    const [pendentes, aprovadas, recusadas] = await Promise.all([
      db.timeJustification.count({ where: { status: 'PENDENTE' } }),
      db.timeJustification.count({ where: { status: 'APROVADA' } }),
      db.timeJustification.count({ where: { status: 'RECUSADA' } }),
    ]);
    return { pendentes, aprovadas, recusadas };
  }

  createJustification(dto: CreateJustificationDto) {
    return this.db().timeJustification.create({
      data: { employeeId: dto.employeeId, data: new Date(dto.data), ocorrencia: dto.ocorrencia, tenantId: getRequestContext().tenantId },
    });
  }

  private async mustFindPending(id: string) {
    const row = await this.db().timeJustification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Justificativa não encontrada.');
    if (row.status !== 'PENDENTE') throw new BadRequestException('Justificativa já foi processada.');
    return row;
  }

  async approve(id: string) {
    await this.mustFindPending(id);
    return this.db().timeJustification.update({ where: { id }, data: { status: 'APROVADA' } });
  }

  async reject(id: string) {
    await this.mustFindPending(id);
    return this.db().timeJustification.update({ where: { id }, data: { status: 'RECUSADA' } });
  }
}
