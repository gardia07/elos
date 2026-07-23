import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateDeadlineDto, UpdateDeadlineDto } from './dto/deadlines.dto';

const ALERT_WINDOW_DAYS = 30;

@Injectable()
export class DeadlinesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const rows = await this.db().laborDeadline.findMany({ orderBy: { vencimento: 'asc' } });
    const hoje = new Date();
    return rows.map((r) => ({
      ...r,
      status: r.cumprido ? 'Cumprido' : daysUntil(r.vencimento, hoje) <= ALERT_WINDOW_DAYS ? 'Pendente' : 'Em dia',
    }));
  }

  create(dto: CreateDeadlineDto) {
    return this.db().laborDeadline.create({
      data: { obrigacao: dto.obrigacao, vencimento: new Date(dto.vencimento), tenantId: getRequestContext().tenantId },
    });
  }

  async update(id: string, dto: UpdateDeadlineDto) {
    const row = await this.db().laborDeadline.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Prazo não encontrado.');
    return this.db().laborDeadline.update({ where: { id }, data: dto });
  }
}

function daysUntil(date: Date, from: Date): number {
  return Math.round((date.getTime() - from.getTime()) / 86_400_000);
}
