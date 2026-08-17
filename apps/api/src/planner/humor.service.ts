import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetHumorDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class HumorService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list(ano: number) {
    const { userId } = getRequestContext();
    return this.db().humorRegistro.findMany({
      where: { userId, data: { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) } },
      orderBy: { data: 'asc' },
    });
  }

  set(dto: SetHumorDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    return this.db().humorRegistro.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, nivel: dto.nivel, nota: dto.nota },
      update: { nivel: dto.nivel, nota: dto.nota },
    });
  }
}
