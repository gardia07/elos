import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetSwotPessoalDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class SwotPessoalService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    const { userId } = getRequestContext();
    return this.db().swotPessoalRegistro.findMany({ where: { userId }, orderBy: { data: 'desc' }, take: 12 });
  }

  set(dto: SetSwotPessoalDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    const campos = { forcas: dto.forcas, fraquezas: dto.fraquezas, oportunidades: dto.oportunidades, ameacas: dto.ameacas };
    return this.db().swotPessoalRegistro.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, ...campos },
      update: campos,
    });
  }
}
