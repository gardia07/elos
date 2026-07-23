import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreatePgrActionDto, UpdatePgrActionDto } from './dto/pgr.dto';

@Injectable()
export class PgrService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async listActions() {
    const actions = await this.db().pgrAction.findMany({ orderBy: { prazo: 'asc' } });
    const hoje = new Date();
    return actions.map((a) => ({ ...a, atrasada: a.status !== 'CONCLUIDA' && a.prazo < hoje }));
  }

  createAction(dto: CreatePgrActionDto) {
    return this.db().pgrAction.create({
      data: { acao: dto.acao, setor: dto.setor, prazo: new Date(dto.prazo), tenantId: getRequestContext().tenantId },
    });
  }

  async updateAction(id: string, dto: UpdatePgrActionDto) {
    const action = await this.db().pgrAction.findUnique({ where: { id } });
    if (!action) throw new NotFoundException('Ação do PGR não encontrada.');
    return this.db().pgrAction.update({ where: { id }, data: { status: dto.status } });
  }

  /** PCMSO "exames a vencer" widget — reuses the real OccupationalExam records
   * instead of duplicating a second data source, unlike the prototype. */
  async pcmsoUpcoming() {
    const exams = await this.db().occupationalExam.findMany({
      where: { resultado: null },
      include: { employee: { select: { nome: true } } },
      orderBy: { dataPrevista: 'asc' },
      take: 10,
    });
    const hoje = new Date();
    return exams
      .map((e) => ({
        nome: e.employee.nome,
        tipo: e.tipo,
        dataPrevista: e.dataPrevista,
        diasRestantes: Math.round((e.dataPrevista.getTime() - hoje.getTime()) / 86_400_000),
      }))
      .filter((e) => e.diasRestantes <= 15);
  }
}
