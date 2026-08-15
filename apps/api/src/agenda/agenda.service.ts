import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { CreateAgendaItemDto, SaveNotepadDto, UpdateAgendaItemDto } from './dto/agenda.dto';

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

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
    const created = await this.db().agendaItem.create({
      data: {
        tenantId,
        userId,
        data: startOfDayUtc(dto.data),
        hora: dto.hora,
        horaFim: dto.horaFim,
        descricao: dto.descricao,
        notas: dto.notas,
        tipo: dto.tipo,
        categoriaId: dto.categoriaId,
      },
      include: { categoria: true },
    });
    await this.audit.log('agenda_item', created.id, 'criado', { descricao: created.descricao, data: dto.data });
    return created;
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
