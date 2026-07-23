import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateAgendaItemDto, SaveNotepadDto, UpdateAgendaItemDto } from './dto/agenda.dto';

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async listItems(date: string) {
    const { userId, tenantId } = getRequestContext();
    return this.db().agendaItem.findMany({
      where: { userId, tenantId, data: startOfDayUtc(date) },
      orderBy: [{ hora: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createItem(dto: CreateAgendaItemDto) {
    const { userId, tenantId } = getRequestContext();
    return this.db().agendaItem.create({
      data: {
        tenantId,
        userId,
        data: startOfDayUtc(dto.data),
        hora: dto.hora,
        descricao: dto.descricao,
      },
    });
  }

  async toggleItem(id: string, dto: UpdateAgendaItemDto) {
    const db = this.db();
    const item = await db.agendaItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item de agenda não encontrado.');
    return db.agendaItem.update({ where: { id }, data: { concluida: dto.concluida } });
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
