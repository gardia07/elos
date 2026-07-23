import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateNrTrainingDto } from './dto/nr-trainings.dto';

const ALERT_WINDOW_DAYS = 30;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function computeStatus(dataRealizacao: Date, validadeMeses: number, hoje: Date): { vencimento: Date; status: string } {
  const vencimento = addMonths(dataRealizacao, validadeMeses);
  const diasRestantes = Math.round((vencimento.getTime() - hoje.getTime()) / 86_400_000);
  const status = diasRestantes < 0 ? 'Vencido' : diasRestantes <= ALERT_WINDOW_DAYS ? 'Vencendo' : 'Válido';
  return { vencimento, status };
}

@Injectable()
export class NrTrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const records = await this.db().nrTrainingRecord.findMany({
      orderBy: { dataRealizacao: 'desc' },
      include: { employee: { select: { nome: true } } },
    });
    const hoje = new Date();
    return records.map((r) => ({ ...r, ...computeStatus(r.dataRealizacao, r.validadeMeses, hoje) }));
  }

  async byCurso() {
    const records = await this.list();
    const map = new Map<string, { curso: string; validos: number; vencendo: number; vencidos: number }>();
    for (const r of records) {
      const row = map.get(r.curso) ?? { curso: r.curso, validos: 0, vencendo: 0, vencidos: 0 };
      if (r.status === 'Válido') row.validos++;
      else if (r.status === 'Vencendo') row.vencendo++;
      else row.vencidos++;
      map.set(r.curso, row);
    }
    return Array.from(map.values());
  }

  async kpis() {
    const records = await this.list();
    return { vencendo: records.filter((r) => r.status === 'Vencendo').length, vencidos: records.filter((r) => r.status === 'Vencido').length };
  }

  create(dto: CreateNrTrainingDto) {
    return this.db().nrTrainingRecord.create({
      data: {
        tenantId: getRequestContext().tenantId,
        employeeId: dto.employeeId,
        curso: dto.curso,
        dataRealizacao: new Date(dto.dataRealizacao),
        validadeMeses: dto.validadeMeses,
      },
    });
  }
}
