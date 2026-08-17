import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetRodaDaVidaDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class RodaDaVidaService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  /** Traz as últimas 12 avaliações — o suficiente pra comparar evolução sem carregar histórico infinito. */
  list() {
    const { userId } = getRequestContext();
    return this.db().rodaDaVidaAvaliacao.findMany({ where: { userId }, orderBy: { data: 'desc' }, take: 12 });
  }

  set(dto: SetRodaDaVidaDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    const campos = {
      carreira: dto.carreira,
      financas: dto.financas,
      saude: dto.saude,
      familiaAmigos: dto.familiaAmigos,
      relacionamento: dto.relacionamento,
      crescimentoPessoal: dto.crescimentoPessoal,
      lazer: dto.lazer,
      ambienteFisico: dto.ambienteFisico,
    };
    return this.db().rodaDaVidaAvaliacao.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, ...campos },
      update: campos,
    });
  }
}
