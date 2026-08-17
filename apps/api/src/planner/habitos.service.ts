import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateHabitoDto, ToggleHabitoDto, UpdateHabitoDto } from './dto/planner.dto';
import { hojeBrasiliaUtc, startOfDayUtc } from './date-utils';
import { computeStreak } from './streak.util';

@Injectable()
export class HabitosService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list(ano: number) {
    const { userId } = getRequestContext();
    const habitos = await this.db().habitoPessoal.findMany({
      where: { userId, ano },
      include: { registros: { select: { data: true } } },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    });
    const hojeUtc = hojeBrasiliaUtc();
    return habitos.map((h) => {
      const datas = h.registros.map((r) => r.data);
      const { atual, recorde } = computeStreak(datas, hojeUtc);
      return {
        id: h.id,
        nome: h.nome,
        cor: h.cor,
        ordem: h.ordem,
        ano: h.ano,
        diasMarcados: datas.map((d) => d.toISOString().slice(0, 10)),
        streakAtual: atual,
        streakRecorde: recorde,
      };
    });
  }

  create(dto: CreateHabitoDto) {
    const { tenantId, userId } = getRequestContext();
    return this.db().habitoPessoal.create({ data: { tenantId, userId, ano: dto.ano, nome: dto.nome, cor: dto.cor } });
  }

  private async mustFind(id: string) {
    const { userId } = getRequestContext();
    const habito = await this.db().habitoPessoal.findFirst({ where: { id, userId } });
    if (!habito) throw new NotFoundException('Hábito não encontrado.');
    return habito;
  }

  async update(id: string, dto: UpdateHabitoDto) {
    await this.mustFind(id);
    return this.db().habitoPessoal.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.mustFind(id);
    await this.db().habitoPessoal.delete({ where: { id } });
    return { ok: true };
  }

  async toggle(id: string, dto: ToggleHabitoDto) {
    await this.mustFind(id);
    const { tenantId } = getRequestContext();
    const db = this.db();
    const data = startOfDayUtc(dto.data);
    const existing = await db.habitoPessoalRegistro.findUnique({ where: { habitoId_data: { habitoId: id, data } } });
    if (existing) {
      await db.habitoPessoalRegistro.delete({ where: { id: existing.id } });
      return { marcado: false };
    }
    await db.habitoPessoalRegistro.create({ data: { tenantId, habitoId: id, data } });
    return { marcado: true };
  }
}
