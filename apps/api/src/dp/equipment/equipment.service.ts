import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateEquipmentDto } from './dto/equipment.dto';

const ALERT_WINDOW_DAYS = 30;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const rows = await this.db().equipmentItem.findMany({
      orderBy: { entregaEm: 'desc' },
      include: { employee: { select: { nome: true } } },
    });
    const hoje = new Date();
    return rows.map((r) => {
      const vencimento = addMonths(r.entregaEm, r.validadeMeses);
      const daysLeft = Math.round((vencimento.getTime() - hoje.getTime()) / 86_400_000);
      const status = daysLeft < 0 ? 'Vencido' : daysLeft <= ALERT_WINDOW_DAYS ? 'Vencendo' : 'Válido';
      return { ...r, vencimento, status };
    });
  }

  create(dto: CreateEquipmentDto) {
    return this.db().equipmentItem.create({
      data: {
        employeeId: dto.employeeId,
        item: dto.item,
        entregaEm: new Date(dto.entregaEm),
        validadeMeses: dto.validadeMeses,
        tenantId: getRequestContext().tenantId,
      },
    });
  }
}
