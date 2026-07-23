import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CloseAccidentDto, CreateAccidentDto, UpdateInvestigationDto } from './dto/accidents.dto';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class AccidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().accident.findMany({
      orderBy: { dataAcidente: 'desc' },
      include: { employee: { select: { nome: true } } },
    });
  }

  async get(id: string) {
    const accident = await this.db().accident.findUnique({
      where: { id },
      include: { employee: { select: { id: true, nome: true } } },
    });
    if (!accident) throw new NotFoundException('CAT não encontrada.');

    const diffDias = Math.round((accident.dataEmissaoCat.getTime() - accident.dataAcidente.getTime()) / 86_400_000);
    const emissaoAtrasada = diffDias > 1;

    const auditLog = await this.audit.listForEntity('accident', id);
    return { ...accident, emissaoAtrasada, auditLog };
  }

  async kpis() {
    const db = this.db();
    const hoje = new Date();
    const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

    const cats = await db.accident.findMany();
    const doMes = cats.filter((c) => c.dataAcidente >= inicioMes);
    const comAfastamento = doMes.filter((c) => c.comAfastamento).length;
    const diasPerdidos = cats.reduce((sum, c) => sum + c.diasAfastamento, 0);
    // Fórmula simplificada de demonstração — a taxa de gravidade real (NR/OSHA)
    // usa dias perdidos por milhão de horas-homem trabalhadas, dado que não
    // temos aqui (banco de horas). Mantemos o mesmo fator do protótipo.
    const taxaGravidade = Number((diasPerdidos * 3.6).toFixed(1));
    const pendentesEsocial = cats.filter((c) => !c.esocialSent).length;

    return { comAfastamento, diasPerdidos, taxaGravidade, pendentesEsocial, totalMes: doMes.length };
  }

  async create(dto: CreateAccidentDto) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const dataAcidente = new Date(dto.dataAcidente);
    const dataEmissaoCat = new Date(dto.dataEmissaoCat);
    const diasAfastamento = dto.comAfastamento ? (dto.diasAfastamento ?? 0) : 0;

    const accident = await db.accident.create({
      data: {
        tenantId: getRequestContext().tenantId,
        employeeId: dto.employeeId,
        cargo: employee.cargo,
        tipoAcidente: dto.tipoAcidente,
        comAfastamento: !!dto.comAfastamento,
        diasAfastamento,
        dataAcidente,
        dataEmissaoCat,
        descricao: dto.descricao,
      },
    });

    if (dto.comAfastamento) {
      await db.leaveRecord.create({
        data: {
          tenantId: getRequestContext().tenantId,
          employeeId: dto.employeeId,
          tipo: 'Acidente de trabalho',
          inicio: dataAcidente,
          retorno: diasAfastamento > 0 ? addDays(dataAcidente, diasAfastamento) : undefined,
        },
      });
    }

    await db.historicoEvento.create({
      data: {
        employeeId: dto.employeeId,
        evento: `CAT registrada — ${dto.tipoAcidente === 'TIPICO' ? 'acidente típico' : dto.tipoAcidente === 'TRAJETO' ? 'acidente de trajeto' : 'doença ocupacional'}`,
        categoria: 'SST',
        autor: getRequestContext().userName,
      },
    });

    await this.audit.log('accident', accident.id, 'criada');
    return accident;
  }

  async sendEsocial(id: string) {
    await this.mustFind(id);
    const updated = await this.db().accident.update({ where: { id }, data: { esocialSent: true } });
    await this.audit.log('accident', id, 'esocial_s2210_enviado');
    return updated;
  }

  async updateInvestigation(id: string, dto: UpdateInvestigationDto) {
    await this.mustFind(id);
    const updated = await this.db().accident.update({ where: { id }, data: dto });
    await this.audit.log('accident', id, 'investigacao_atualizada');
    return updated;
  }

  async close(id: string, dto: CloseAccidentDto) {
    const accident = await this.mustFind(id);
    if (accident.status === 'ENCERRADA') throw new BadRequestException('CAT já encerrada.');
    const updated = await this.db().accident.update({
      where: { id },
      data: { status: 'ENCERRADA', notaEncerramento: dto.notaEncerramento },
    });
    await this.audit.log('accident', id, 'encerrada');
    return updated;
  }

  private async mustFind(id: string) {
    const accident = await this.db().accident.findUnique({ where: { id } });
    if (!accident) throw new NotFoundException('CAT não encontrada.');
    return accident;
  }
}
