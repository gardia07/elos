import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetMelhorEuPossivelDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class MelhorEuPossivelService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  /** Traz os últimos 12 registros — o suficiente pra revisitar sem carregar histórico infinito. */
  list() {
    const { userId } = getRequestContext();
    return this.db().melhorEuPossivelRegistro.findMany({ where: { userId }, orderBy: { data: 'desc' }, take: 12 });
  }

  set(dto: SetMelhorEuPossivelDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    return this.db().melhorEuPossivelRegistro.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, texto: dto.texto },
      update: { texto: dto.texto },
    });
  }
}
