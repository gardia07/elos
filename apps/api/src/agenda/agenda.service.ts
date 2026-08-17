import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { CreateAgendaItemDto, CreateComentarioDto, LembreteInputDto, SaveNotepadDto, SaveRevisaoDto, TarefaProjetoStatusDto, UpdateAgendaItemDto } from './dto/agenda.dto';
import { CreateSubtarefaDto, UpdateSubtarefaDto } from './dto/subtarefas.dto';
import { computeOccurrences } from './recurrence.util';
import { hojeBrasiliaUtc } from './date-utils';
import { itemVisivelPara } from './visibility.util';

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

  /** Cria os lembretes de uma seleção de itens (1 item, ou todas as ocorrências de uma série) — ignora alvos que já passaram. */
  private async criarLembretesParaItens(
    db: ReturnType<AgendaService['db']>,
    tenantId: string,
    userId: string,
    itens: { id: string; data: Date }[],
    lembretes: LembreteInputDto,
  ) {
    const hojeUtc = hojeBrasiliaUtc();
    const linhas = itens.flatMap((item) =>
      lembretes.antecedencias
        .map((antecedenciaDias) => ({
          tenantId,
          agendaItemId: item.id,
          userId,
          antecedenciaDias,
          notificarEmail: lembretes.email ?? false,
          alvo: new Date(item.data.getTime() - antecedenciaDias * 86_400_000),
        }))
        .filter((l) => l.alvo.getTime() >= hojeUtc.getTime())
        .map(({ alvo, ...resto }) => resto),
    );
    if (linhas.length === 0) return;
    await db.agendaLembrete.createMany({ data: linhas });
  }

  async listItems(date?: string, dataInicio?: string, dataFim?: string) {
    const { userId, tenantId } = getRequestContext();
    const visivel = await itemVisivelPara(this.db(), userId);
    const where =
      dataInicio && dataFim
        ? { tenantId, deletedAt: null, ...visivel, data: { gte: startOfDayUtc(dataInicio), lte: startOfDayUtc(dataFim) } }
        : { tenantId, deletedAt: null, ...visivel, data: startOfDayUtc(date!) };
    return this.db().agendaItem.findMany({
      where,
      include: { categoria: true, lembretes: { where: { enviado: false }, select: { antecedenciaDias: true, notificarEmail: true } } },
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
      responsavelId: dto.responsavelId,
      hora: dto.hora,
      horaFim: dto.horaFim,
      descricao: dto.descricao,
      notas: dto.notas,
      tipo: dto.tipo,
      categoriaId: dto.categoriaId,
      projetoId: dto.projetoId,
    };

    if (!dto.recorrencia) {
      const created = await db.agendaItem.create({
        data: { ...camposComuns, data: startOfDayUtc(dto.data) },
        include: { categoria: true },
      });
      await this.audit.log('agenda_item', created.id, 'criado', { descricao: created.descricao, data: dto.data });
      if (dto.lembretes) await this.criarLembretesParaItens(db, tenantId, userId, [{ id: created.id, data: created.data }], dto.lembretes);
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

    const criadas = await db.agendaItem.createManyAndReturn({
      data: datas.map((data) => ({ ...camposComuns, data, recorrenciaId: recorrencia.id })),
    });
    await this.audit.log('agenda_recorrencia', recorrencia.id, 'criado', {
      descricao: dto.descricao,
      frequencia: dto.recorrencia.frequencia,
      totalOcorrencias: datas.length,
    });
    if (dto.lembretes) await this.criarLembretesParaItens(db, tenantId, userId, criadas, dto.lembretes);

    const primeiraOcorrencia = await db.agendaItem.findFirst({
      where: { recorrenciaId: recorrencia.id },
      orderBy: { data: 'asc' },
      include: { categoria: true },
    });
    return { ...primeiraOcorrencia, totalOcorrencias: datas.length };
  }

  private async mustFind(id: string) {
    const { userId, tenantId } = getRequestContext();
    const visivel = await itemVisivelPara(this.db(), userId);
    const item = await this.db().agendaItem.findFirst({ where: { id, tenantId, deletedAt: null, ...visivel } });
    if (!item) throw new NotFoundException('Item de agenda não encontrado.');
    return item;
  }

  /** Kanban (statusProjeto) e o checkbox de concluída (usado no resto da Agenda) representam a mesma coisa em telas diferentes — mantém os dois em sincronia sem exigir que quem chama a API saiba da regra. */
  private sincronizarStatusProjeto(
    dto: UpdateAgendaItemDto,
    antes: { statusProjeto: TarefaProjetoStatusDto },
  ): { statusProjeto: TarefaProjetoStatusDto | undefined; concluida: boolean | undefined } {
    if (dto.statusProjeto !== undefined) {
      return { statusProjeto: dto.statusProjeto, concluida: dto.statusProjeto === 'CONCLUIDA' };
    }
    if (dto.concluida !== undefined) {
      const statusProjeto = dto.concluida ? 'CONCLUIDA' : antes.statusProjeto === 'CONCLUIDA' ? 'EM_ANDAMENTO' : undefined;
      return { statusProjeto, concluida: dto.concluida };
    }
    return { statusProjeto: undefined, concluida: undefined };
  }

  async updateItem(id: string, dto: UpdateAgendaItemDto) {
    const { userId, tenantId } = getRequestContext();
    const antes = await this.mustFind(id);
    const db = this.db();
    const { statusProjeto, concluida } = this.sincronizarStatusProjeto(dto, antes);
    const updated = await db.agendaItem.update({
      where: { id },
      data: {
        data: dto.data ? startOfDayUtc(dto.data) : undefined,
        hora: dto.hora,
        horaFim: dto.horaFim,
        descricao: dto.descricao,
        concluida,
        notas: dto.notas,
        tipo: dto.tipo,
        categoriaId: dto.categoriaId,
        responsavelId: dto.responsavelId,
        projetoId: dto.projetoId,
        statusProjeto,
      },
      include: { categoria: true },
    });
    const reatribuido = dto.responsavelId !== undefined && dto.responsavelId !== antes.responsavelId;
    const action = reatribuido ? 'atribuido' : dto.concluida === true ? 'concluido' : dto.concluida === false ? 'reaberto' : 'editado';
    await this.audit.log('agenda_item', id, action, { ...dto });
    if (dto.lembretes) {
      await db.agendaLembrete.deleteMany({ where: { agendaItemId: id, enviado: false } });
      await this.criarLembretesParaItens(db, tenantId, userId, [{ id: updated.id, data: updated.data }], dto.lembretes);
    }
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
    const visivel = await itemVisivelPara(db, userId);
    const hojeUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const { count } = await db.agendaItem.updateMany({
      where: { recorrenciaId, tenantId, deletedAt: null, data: { gte: hojeUtc }, ...visivel },
      data: { deletedAt: new Date() },
    });
    await this.audit.log('agenda_recorrencia', recorrenciaId, 'serie_excluida', { ocorrenciasExcluidas: count });
    return { ok: true, ocorrenciasExcluidas: count };
  }

  async restoreItem(id: string) {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const visivel = await itemVisivelPara(db, userId);
    const item = await db.agendaItem.findFirst({ where: { id, tenantId, ...visivel } });
    if (!item) throw new NotFoundException('Item de agenda não encontrado.');
    const restored = await db.agendaItem.update({ where: { id }, data: { deletedAt: null }, include: { categoria: true } });
    await this.audit.log('agenda_item', id, 'restaurado');
    return restored;
  }

  async listUsuariosRh() {
    const { tenantId } = getRequestContext();
    // User não tem RLS (mesmo aviso em tenant.service.ts) — o filtro por tenantId aqui é obrigatório, não redundante.
    return this.prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA'] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async listComentarios(agendaItemId: string) {
    await this.mustFind(agendaItemId);
    const { tenantId } = getRequestContext();
    return this.db().agendaComentario.findMany({ where: { tenantId, agendaItemId }, orderBy: { createdAt: 'asc' } });
  }

  async criarComentario(agendaItemId: string, dto: CreateComentarioDto) {
    await this.mustFind(agendaItemId);
    const { tenantId, userId, userName } = getRequestContext();
    const comentario = await this.db().agendaComentario.create({
      data: { tenantId, agendaItemId, userId, autor: userName, texto: dto.texto },
    });
    await this.audit.log('agenda_item', agendaItemId, 'comentario_adicionado', { comentarioId: comentario.id });
    return comentario;
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

  async getRevisao(date: string) {
    const { userId, tenantId } = getRequestContext();
    const entry = await this.db().agendaRevisaoDiaria.findUnique({
      where: { tenantId_userId_data: { tenantId, userId, data: startOfDayUtc(date) } },
    });
    return { reflexao: entry?.reflexao ?? '' };
  }

  async saveRevisao(date: string, dto: SaveRevisaoDto) {
    const { userId, tenantId } = getRequestContext();
    const data = startOfDayUtc(date);
    return this.db().agendaRevisaoDiaria.upsert({
      where: { tenantId_userId_data: { tenantId, userId, data } },
      create: { tenantId, userId, data, reflexao: dto.reflexao },
      update: { reflexao: dto.reflexao },
    });
  }

  async listNotificacoes() {
    const { userId, tenantId } = getRequestContext();
    return this.db().agendaNotificacao.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  async marcarNotificacaoLida(id: string) {
    const { userId, tenantId } = getRequestContext();
    await this.db().agendaNotificacao.updateMany({ where: { id, tenantId, userId }, data: { lida: true } });
    return { ok: true };
  }

  async listSubtarefas(agendaItemId: string) {
    await this.mustFind(agendaItemId);
    return this.db().agendaItemSubtarefa.findMany({ where: { agendaItemId }, orderBy: { ordem: 'asc' } });
  }

  async criarSubtarefa(agendaItemId: string, dto: CreateSubtarefaDto) {
    await this.mustFind(agendaItemId);
    const { tenantId } = getRequestContext();
    const db = this.db();
    const ultima = await db.agendaItemSubtarefa.findFirst({ where: { agendaItemId }, orderBy: { ordem: 'desc' } });
    return db.agendaItemSubtarefa.create({
      data: { tenantId, agendaItemId, titulo: dto.titulo, ordem: (ultima?.ordem ?? -1) + 1 },
    });
  }

  async atualizarSubtarefa(agendaItemId: string, subtarefaId: string, dto: UpdateSubtarefaDto) {
    await this.mustFind(agendaItemId);
    const db = this.db();
    const { count } = await db.agendaItemSubtarefa.updateMany({
      where: { id: subtarefaId, agendaItemId },
      data: { titulo: dto.titulo, concluida: dto.concluida },
    });
    if (count === 0) throw new NotFoundException('Subtarefa não encontrada.');
    return db.agendaItemSubtarefa.findUniqueOrThrow({ where: { id: subtarefaId } });
  }

  async excluirSubtarefa(agendaItemId: string, subtarefaId: string) {
    await this.mustFind(agendaItemId);
    const { count } = await this.db().agendaItemSubtarefa.deleteMany({ where: { id: subtarefaId, agendaItemId } });
    if (count === 0) throw new NotFoundException('Subtarefa não encontrada.');
    return { ok: true };
  }
}
