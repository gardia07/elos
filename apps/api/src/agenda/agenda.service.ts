import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { CreateAgendaItemDto, SaveNotepadDto, UpdateAgendaItemDto } from './dto/agenda.dto';
import { computeOccurrences } from './recurrence.util';

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const DOIS_ANOS_MS = 2 * 365 * 86_400_000;

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async listItems(date?: string, dataInicio?: string, dataFim?: string) {
    const { userId, tenantId } = getRequestContext();
    const where =
      dataInicio && dataFim
        ? { userId, tenantId, deletedAt: null, data: { gte: startOfDayUtc(dataInicio), lte: startOfDayUtc(dataFim) } }
        : { userId, tenantId, deletedAt: null, data: startOfDayUtc(date!) };
    return this.db().agendaItem.findMany({
      where,
      include: { categoria: true },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listCategorias() {
    const { tenantId } = getRequestContext();
    return this.db().agendaCategoria.findMany({ where: { tenantId }, orderBy: { ordem: 'asc' } });
  }

  async createItem(dto: CreateAgendaItemDto) {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const camposComuns = {
      tenantId,
      userId,
      hora: dto.hora,
      horaFim: dto.horaFim,
      descricao: dto.descricao,
      notas: dto.notas,
      tipo: dto.tipo,
      categoriaId: dto.categoriaId,
    };

    if (!dto.recorrencia) {
      const created = await db.agendaItem.create({
        data: { ...camposComuns, data: startOfDayUtc(dto.data) },
        include: { categoria: true },
      });
      await this.audit.log('agenda_item', created.id, 'criado', { descricao: created.descricao, data: dto.data });
      return created;
    }

    const dataInicio = startOfDayUtc(dto.data);
    const dataFim = startOfDayUtc(dto.recorrencia.dataFim);
    if (dataFim.getTime() < dataInicio.getTime()) throw new BadRequestException('A data de término da recorrência não pode ser anterior à data inicial.');
    if (dataFim.getTime() - dataInicio.getTime() > DOIS_ANOS_MS) throw new BadRequestException('A recorrência não pode durar mais de 2 anos.');

    const recorrencia = await db.agendaRecorrencia.create({
      data: {
        tenantId,
        userId,
        frequencia: dto.recorrencia.frequencia,
        intervalo: dto.recorrencia.intervalo ?? 1,
        diasDaSemana: dto.recorrencia.diasDaSemana ?? [],
        posicaoNoMes: dto.recorrencia.posicaoNoMes,
        dataInicio,
        dataFim,
      },
    });

    const datas = computeOccurrences({
      frequencia: dto.recorrencia.frequencia,
      intervalo: dto.recorrencia.intervalo ?? 1,
      diasDaSemana: dto.recorrencia.diasDaSemana ?? [],
      posicaoNoMes: dto.recorrencia.posicaoNoMes ?? null,
      dataInicio,
      dataFim,
    });
    if (datas.length === 0) throw new BadRequestException('Nenhuma ocorrência cai dentro do período informado para essa recorrência.');

    await db.agendaItem.createMany({
      data: datas.map((data) => ({ ...camposComuns, data, recorrenciaId: recorrencia.id })),
    });
    await this.audit.log('agenda_recorrencia', recorrencia.id, 'criado', {
      descricao: dto.descricao,
      frequencia: dto.recorrencia.frequencia,
      totalOcorrencias: datas.length,
    });

    const primeiraOcorrencia = await db.agendaItem.findFirst({
      where: { recorrenciaId: recorrencia.id },
      orderBy: { data: 'asc' },
      include: { categoria: true },
    });
    return { ...primeiraOcorrencia, totalOcorrencias: datas.length };
  }

  private async mustFind(id: string) {
    const { userId, tenantId } = getRequestContext();
    const item = await this.db().agendaItem.findFirst({ where: { id, userId, tenantId, deletedAt: null } });
    if (!item) throw new NotFoundException('Item de agenda não encontrado.');
    return item;
  }

  async updateItem(id: string, dto: UpdateAgendaItemDto) {
    await this.mustFind(id);
    const db = this.db();
    const updated = await db.agendaItem.update({
      where: { id },
      data: {
        data: dto.data ? startOfDayUtc(dto.data) : undefined,
        hora: dto.hora,
        horaFim: dto.horaFim,
        descricao: dto.descricao,
        concluida: dto.concluida,
        notas: dto.notas,
        tipo: dto.tipo,
        categoriaId: dto.categoriaId,
      },
      include: { categoria: true },
    });
    const action = dto.concluida === true ? 'concluido' : dto.concluida === false ? 'reaberto' : 'editado';
    await this.audit.log('agenda_item', id, action, { ...dto });
    return updated;
  }

  async deleteItem(id: string) {
    await this.mustFind(id);
    await this.db().agendaItem.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log('agenda_item', id, 'excluido');
    return { ok: true };
  }

  /** Exclui (soft-delete) as ocorrências de hoje em diante da série — as passadas ficam intactas, mesmo princípio do "esta e as seguintes" do Google Calendar. */
  async deleteSeries(recorrenciaId: string) {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const hojeUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const { count } = await db.agendaItem.updateMany({
      where: { recorrenciaId, userId, tenantId, deletedAt: null, data: { gte: hojeUtc } },
      data: { deletedAt: new Date() },
    });
    await this.audit.log('agenda_recorrencia', recorrenciaId, 'serie_excluida', { ocorrenciasExcluidas: count });
    return { ok: true, ocorrenciasExcluidas: count };
  }

  async restoreItem(id: string) {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const item = await db.agendaItem.findFirst({ where: { id, userId, tenantId } });
    if (!item) throw new NotFoundException('Item de agenda não encontrado.');
    const restored = await db.agendaItem.update({ where: { id }, data: { deletedAt: null }, include: { categoria: true } });
    await this.audit.log('agenda_item', id, 'restaurado');
    return restored;
  }

  async getNotepad(date: string) {
    const { userId, tenantId } = getRequestContext();
    const entry = await this.db().notepadEntry.findUnique({
      where: { tenantId_userId_data: { tenantId, userId, data: startOfDayUtc(date) } },
    });
    return { conteudo: entry?.conteudo ?? '' };
  }

  async saveNotepad(date: string, dto: SaveNotepadDto) {
    const { userId, tenantId } = getRequestContext();
    const data = startOfDayUtc(date);
    return this.db().notepadEntry.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, conteudo: dto.conteudo },
      update: { conteudo: dto.conteudo },
    });
  }
}
