import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateLeaveDto, CreateVacationRequestDto } from './dto/vacations.dto';

function formatBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function inclusiveDays(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

@Injectable()
export class VacationsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listRequests(status?: 'PENDENTE' | 'APROVADA' | 'RECUSADA') {
    return this.db().vacationRequest.findMany({
      where: status ? { status } : undefined,
      include: { employee: { select: { nome: true, departamento: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequest(dto: CreateVacationRequestDto) {
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim < inicio) throw new BadRequestException('A data de fim não pode ser anterior à data de início.');
    return this.db().vacationRequest.create({
      data: { employeeId: dto.employeeId, inicio, fim, status: 'PENDENTE', tenantId: getRequestContext().tenantId },
    });
  }

  async approveRequest(id: string) {
    const db = this.db();
    const request = await db.vacationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    if (request.status !== 'PENDENTE') throw new BadRequestException('Solicitação já foi processada.');

    const dias = inclusiveDays(request.inicio, request.fim);
    const employee = await db.employee.findUniqueOrThrow({ where: { id: request.employeeId } });
    const novoSaldo = Math.max(0, employee.feriasSaldo - dias);

    // NOTE: these are sequential (not one DB transaction) because each call
    // through the tenant-scoped client already opens its own transaction to
    // set the RLS session var — see PrismaService.forCurrentTenant(). A
    // partial failure here would need manual reconciliation; acceptable for
    // this stage, revisit if/when a combinable RLS+transaction pattern is needed.
    const updated = await db.vacationRequest.update({ where: { id }, data: { status: 'APROVADA' } });
    await db.employee.update({ where: { id: request.employeeId }, data: { feriasSaldo: novoSaldo } });
    await db.feriasHistorico.create({
      data: { employeeId: request.employeeId, periodo: `${formatBr(request.inicio)} a ${formatBr(request.fim)}`, dias },
    });
    await db.historicoEvento.create({
      data: {
        employeeId: request.employeeId,
        evento: `Férias aprovadas: ${formatBr(request.inicio)} a ${formatBr(request.fim)} (${dias} dias)`,
        categoria: 'Férias',
        autor: getRequestContext().userName,
      },
    });
    return updated;
  }

  async rejectRequest(id: string) {
    const request = await this.db().vacationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    if (request.status !== 'PENDENTE') throw new BadRequestException('Solicitação já foi processada.');
    return this.db().vacationRequest.update({ where: { id }, data: { status: 'RECUSADA' } });
  }

  async calendar(month: number, year: number) {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = monthEnd.getUTCDate();

    const requests = await this.db().vacationRequest.findMany({
      where: { status: 'APROVADA', inicio: { lte: monthEnd }, fim: { gte: monthStart } },
      include: { employee: { select: { nome: true } } },
    });

    return requests.map((r) => {
      const startDay = r.inicio < monthStart ? 1 : r.inicio.getUTCDate();
      const endDay = r.fim > monthEnd ? daysInMonth : r.fim.getUTCDate();
      return {
        employeeId: r.employeeId,
        nome: r.employee.nome,
        leftPct: ((startDay - 1) / daysInMonth) * 100,
        widthPct: ((endDay - startDay + 1) / daysInMonth) * 100,
      };
    });
  }

  async balances() {
    const employees = await this.db().employee.findMany({
      where: { status: 'ATIVO' },
      select: { id: true, nome: true, feriasSaldo: true },
      orderBy: { nome: 'asc' },
    });
    return employees.map((e) => ({
      employeeId: e.id,
      nome: e.nome,
      direito: 30,
      gozados: 30 - e.feriasSaldo,
      aVencer: e.feriasSaldo,
      alerta: e.feriasSaldo <= 5,
    }));
  }

  listLeaves() {
    return this.db().leaveRecord.findMany({
      include: { employee: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createLeave(dto: CreateLeaveDto) {
    return this.db().leaveRecord.create({
      data: {
        employeeId: dto.employeeId,
        tipo: dto.tipo,
        inicio: new Date(dto.inicio),
        retorno: dto.fim ? new Date(dto.fim) : undefined,
        tenantId: getRequestContext().tenantId,
      },
    });
  }

  async sendLeaveEsocial(id: string) {
    const leave = await this.db().leaveRecord.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Afastamento não encontrado.');
    return this.db().leaveRecord.update({ where: { id }, data: { esocialSent: true } });
  }
}
