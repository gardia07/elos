import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { SetRevisaoMensalDto } from './dto/planner.dto';

@Injectable()
export class RevisaoMensalService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list(ano: number) {
    const { userId } = getRequestContext();
    return this.db().revisaoMensal.findMany({ where: { userId, ano }, orderBy: { mes: 'asc' } });
  }

  set(dto: SetRevisaoMensalDto) {
    const { tenantId, userId } = getRequestContext();
    const campos = {
      desejo: dto.desejo,
      resultado: dto.resultado,
      obstaculo: dto.obstaculo,
      plano: dto.plano,
      satisfacao: dto.satisfacao,
      conquistas: dto.conquistas,
      oQueNaoFuncionou: dto.oQueNaoFuncionou,
      proximoPasso: dto.proximoPasso,
    };
    return this.db().revisaoMensal.upsert({
      where: { tenantId_userId_ano_mes: { tenantId, userId, ano: dto.ano, mes: dto.mes } },
      create: { tenantId, userId, ano: dto.ano, mes: dto.mes, ...campos },
      update: campos,
    });
  }
}
