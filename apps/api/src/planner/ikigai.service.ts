import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetIkigaiDto } from './dto/planner.dto';
import { startOfDayUtc } from './date-utils';

@Injectable()
export class IkigaiService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    const { userId } = getRequestContext();
    return this.db().ikigaiAvaliacao.findMany({ where: { userId }, orderBy: { data: 'desc' }, take: 12 });
  }

  set(dto: SetIkigaiDto) {
    const { tenantId, userId } = getRequestContext();
    const data = startOfDayUtc(dto.data);
    const campos = {
      oQueAma: dto.oQueAma,
      noQueEBom: dto.noQueEBom,
      oMundoPrecisa: dto.oMundoPrecisa,
      peloQuePodeSerPago: dto.peloQuePodeSerPago,
      sintese: dto.sintese,
    };
    return this.db().ikigaiAvaliacao.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, ...campos },
      update: campos,
    });
  }
}
