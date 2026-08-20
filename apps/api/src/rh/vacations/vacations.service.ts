import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateLeaveDto, CreateVacationRequestDto } from './dto/vacations.dto';
import { computeFeriasStatus, inclusiveDays } from './vacation-cycles.util';
import { ComplianceEngineService } from '../../compliance-engine/compliance-engine.service';

function formatBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

@Injectable()
export class VacationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceEngine: ComplianceEngineService,
  ) {}

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
      data: {
        employeeId: dto.employeeId,
        inicio,
        fim,
        diasAbono: dto.diasAbono ?? 0,
        status: 'PENDENTE',
        tenantId: getRequestContext().tenantId,
      },
    });
  }

  async approveRequest(id: string) {
    const db = this.db();
    const request = await db.vacationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    if (request.status !== 'PENDENTE') throw new BadRequestException('Solicitação já foi processada.');

    const dias = inclusiveDays(request.inicio, request.fim);
    const employee = await db.employee.findUniqueOrThrow({ where: { id: request.employeeId } });

    // NOTE: these are sequential (not one DB transaction) because each call
    // through the tenant-scoped client already opens its own transaction to
    // set the RLS session var — see PrismaService.forCurrentTenant(). A
    // partial failure here would need manual reconciliation; acceptable for
    // this stage, revisit if/when a combinable RLS+transaction pattern is needed.
    const updated = await db.vacationRequest.update({ where: { id }, data: { status: 'APROVADA' } });

    const aprovadas = await db.vacationRequest.findMany({
      where: { employeeId: request.employeeId, status: 'APROVADA' },
      select: { inicio: true, fim: true, diasAbono: true },
    });
    const status = computeFeriasStatus(
      employee.dataAdmissao,
      new Date(),
      aprovadas,
    );
    await db.employee.update({
      where: { id: request.employeeId },
      data: {
        feriasSaldo: status.saldoDisponivel,
        feriasVencimento: status.vencimento,
      },
    });
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
      select: {
        id: true,
        nome: true,
        dataAdmissao: true,
        vacationRequests: {
          where: { status: 'APROVADA' },
          select: { inicio: true, fim: true, diasAbono: true },
        },
      },
      orderBy: { nome: 'asc' },
    });
    const hoje = new Date();
    return employees.map((e) => {
      const status = computeFeriasStatus(
        e.dataAdmissao,
        hoje,
        e.vacationRequests,
      );
      return {
        employeeId: e.id,
        nome: e.nome,
        direito: 30,
        gozados: 30 - status.saldoDisponivel,
        aVencer: status.saldoDisponivel,
        alerta: status.saldoDisponivel <= 5,
      };
    });
  }

  listLeaves() {
    return this.db().leaveRecord.findMany({
      include: { employee: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeave(dto: CreateLeaveDto) {
    const leave = await this.db().leaveRecord.create({
      data: {
        employeeId: dto.employeeId,
        tipo: dto.tipo,
        inicio: new Date(dto.inicio),
        retorno: dto.fim ? new Date(dto.fim) : undefined,
        tenantId: getRequestContext().tenantId,
      },
    });
    await this.complianceEngine.registrarEvento({
      employeeId: dto.employeeId,
      tipoEvento: dto.tipo === 'Licença maternidade' ? 'LICENCA_MATERNIDADE' : 'INICIO_AFASTAMENTO',
      dataEvento: leave.inicio,
      dadosNovos: { tipo: dto.tipo },
    });
    return leave;
  }

  async sendLeaveEsocial(id: string) {
    const leave = await this.db().leaveRecord.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Afastamento não encontrado.');
    return this.db().leaveRecord.update({ where: { id }, data: { esocialSent: true } });
  }

  /**
   * Fecha um afastamento em aberto (não existia nenhum jeito de fazer isso
   * antes do Motor de Conformidade Documental) e, quando durou 30 dias ou
   * mais, dispara o evento RETORNO_AFASTAMENTO -- gera a pendência de ASO de
   * retorno ao trabalho (NR-7).
   */
  async registrarRetorno(id: string, dataRetorno: string) {
    const leave = await this.db().leaveRecord.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Afastamento não encontrado.');
    const retorno = new Date(dataRetorno);
    const updated = await this.db().leaveRecord.update({ where: { id }, data: { retorno } });
    const diasAfastado = Math.round((retorno.getTime() - leave.inicio.getTime()) / 86_400_000);
    if (diasAfastado >= 30) {
      await this.complianceEngine.registrarEvento({
        employeeId: leave.employeeId,
        tipoEvento: 'RETORNO_AFASTAMENTO',
        dataEvento: retorno,
        dadosAnteriores: { inicio: leave.inicio },
        dadosNovos: { retorno, diasAfastado },
      });
    }
    return updated;
  }
}
