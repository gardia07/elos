import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateCicloDto, UpdateCicloDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class CicloService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  /** Traz os últimos 12 registros — o suficiente pra estimar duração média do ciclo sem carregar histórico infinito. */
  list() {
    const { userId } = getRequestContext();
    return this.db().cicloMenstrualRegistro.findMany({
      where: { userId },
      orderBy: { dataInicio: 'desc' },
      take: 12,
    });
  }

  create(dto: CreateCicloDto) {
    const { tenantId, userId } = getRequestContext();
    return this.db().cicloMenstrualRegistro.create({
      data: { tenantId, userId, dataInicio: startOfDayUtc(dto.dataInicio), duracaoDias: dto.duracaoDias, sintomas: dto.sintomas },
    });
  }

  private async mustFind(id: string) {
    const { userId } = getRequestContext();
    const registro = await this.db().cicloMenstrualRegistro.findFirst({ where: { id, userId } });
    if (!registro) throw new NotFoundException('Registro não encontrado.');
    return registro;
  }

  async update(id: string, dto: UpdateCicloDto) {
    await this.mustFind(id);
    return this.db().cicloMenstrualRegistro.update({
      where: { id },
      data: {
        dataInicio: dto.dataInicio ? startOfDayUtc(dto.dataInicio) : undefined,
        duracaoDias: dto.duracaoDias,
        sintomas: dto.sintomas,
      },
    });
  }

  async delete(id: string) {
    await this.mustFind(id);
    await this.db().cicloMenstrualRegistro.delete({ where: { id } });
    return { ok: true };
  }
}
