import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetPesoMedidaDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class PesoMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list(ano: number) {
    const { userId } = getRequestContext();
    return this.db().pesoMedidaRegistro.findMany({
      where: { userId, data: { gte: new Date(Date.UTC(ano, 0, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) } },
      orderBy: { data: 'asc' },
    });
  }

  set(dto: SetPesoMedidaDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    return this.db().pesoMedidaRegistro.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, pesoKg: dto.pesoKg, cinturaCm: dto.cinturaCm, quadrilCm: dto.quadrilCm, bracoCm: dto.bracoCm, notas: dto.notas },
      update: { pesoKg: dto.pesoKg, cinturaCm: dto.cinturaCm, quadrilCm: dto.quadrilCm, bracoCm: dto.bracoCm, notas: dto.notas },
    });
  }
}
