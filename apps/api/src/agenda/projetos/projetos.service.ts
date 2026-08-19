import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { AuditService } from '../../audit/audit.service';
import { CreateProjetoDto, SetParticipantesDto, UpdateProjetoDto } from './dto/projetos.dto';
import { CreateMarcoDto, UpdateMarcoDto } from './dto/marcos.dto';
import { SalvarComoModeloDto } from './dto/modelos.dto';

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * 86_400_000);
}

function diasEntre(base: Date, alvo: Date): number {
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000);
}

interface ModeloItem {
  titulo: string;
  diasAposInicio: number;
}

type ProjetoStatusValor = 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'EM_RISCO' | 'CANCELADO';

/**
 * Status é sempre recalculado a partir do progresso -- nunca lido direto do
 * banco -- exceto Cancelado, que fica sob controle manual porque não dá pra
 * inferir cancelamento a partir de tarefas/datas. Uma vez cancelado, o
 * projeto para de ser recalculado até alguém reativá-lo pela edição manual.
 */
function computeStatus(
  projeto: { status: string; dataInicio: Date; dataFim: Date | null },
  tarefas: { concluida: boolean }[],
  marcos: { data: Date; concluido: boolean }[],
  hojeUtc: Date,
): ProjetoStatusValor {
  if (projeto.status === 'CANCELADO') return 'CANCELADO';
  if (tarefas.length > 0 && tarefas.every((t) => t.concluida)) return 'CONCLUIDO';

  const prazoVencido = !!projeto.dataFim && projeto.dataFim.getTime() < hojeUtc.getTime();
  const marcoVencido = marcos.some((m) => !m.concluido && m.data.getTime() < hojeUtc.getTime());
  if (prazoVencido || marcoVencido) return 'EM_RISCO';

  if (projeto.dataInicio.getTime() <= hojeUtc.getTime()) return 'EM_ANDAMENTO';
  return 'PLANEJADO';
}

/** O campo é Json no Prisma (tipagem fraca em tempo de compilação) — os modelos só são escritos por salvarComoModelo, então a forma abaixo é garantida na prática. */
function parseModeloItens(json: unknown): ModeloItem[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
    .map((i) => ({ titulo: String(i.titulo ?? ''), diasAposInicio: Number(i.diasAposInicio ?? 0) }))
    .filter((i) => i.titulo.length > 0);
}

@Injectable()
export class ProjetosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const projetos = await db.projeto.findMany({
      where: { participantes: { some: { userId } } },
      include: {
        participantes: true,
        tarefas: { where: { deletedAt: null }, select: { concluida: true } },
        marcos: { select: { data: true, concluido: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todosUserIds = [...new Set(projetos.flatMap((p) => p.participantes.map((pp) => pp.userId)))];
    // User não tem RLS (mesmo aviso em tenant.service.ts) — filtro por tenantId aqui é obrigatório, não redundante.
    const usuarios = todosUserIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: todosUserIds }, tenantId }, select: { id: true, name: true } })
      : [];
    const nomePorId = new Map(usuarios.map((u) => [u.id, u.name]));

    const hoje = new Date();
    const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

    return projetos.map((p) => {
      const total = p.tarefas.length;
      const concluidas = p.tarefas.filter((t) => t.concluida).length;
      const status = computeStatus(p, p.tarefas, p.marcos, hojeUtc);
      const atrasado = status === 'EM_RISCO' && !!p.dataFim && p.dataFim.getTime() < hojeUtc.getTime();
      return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        dataInicio: p.dataInicio,
        dataFim: p.dataFim,
        status,
        cor: p.cor,
        wipLimiteEmAndamento: p.wipLimiteEmAndamento,
        criadoPorId: p.criadoPorId,
        participantes: p.participantes.map((pp) => ({ userId: pp.userId, nome: nomePorId.get(pp.userId) ?? '—' })),
        totalTarefas: total,
        tarefasConcluidas: concluidas,
        progresso: total > 0 ? Math.round((concluidas / total) * 100) : 0,
        atrasado,
      };
    });
  }

  async create(dto: CreateProjetoDto) {
    const { tenantId, userId } = getRequestContext();
    const db = this.db();
    const participanteIds = new Set([userId, ...(dto.participanteIds ?? [])]);
    const dataInicio = startOfDayUtc(dto.dataInicio);

    const modelo = dto.modeloId ? await db.projetoModelo.findFirst({ where: { id: dto.modeloId, tenantId } }) : null;
    if (dto.modeloId && !modelo) throw new NotFoundException('Modelo não encontrado.');

    const projeto = await db.projeto.create({
      data: {
        tenantId,
        nome: dto.nome,
        descricao: dto.descricao,
        dataInicio,
        dataFim: dto.dataFim ? startOfDayUtc(dto.dataFim) : undefined,
        cor: dto.cor ?? modelo?.cor,
        criadoPorId: userId,
        participantes: { createMany: { data: [...participanteIds].map((id) => ({ tenantId, userId: id })) } },
      },
    });

    if (modelo) {
      const tarefas = parseModeloItens(modelo.tarefas);
      const marcos = parseModeloItens(modelo.marcos);
      if (tarefas.length > 0) {
        await db.agendaItem.createMany({
          data: tarefas.map((t) => ({
            tenantId,
            userId,
            projetoId: projeto.id,
            data: addDaysUtc(dataInicio, t.diasAposInicio),
            descricao: t.titulo,
            tipo: 'TAREFA',
          })),
        });
      }
      if (marcos.length > 0) {
        await db.projetoMarco.createMany({
          data: marcos.map((m, i) => ({
            tenantId,
            projetoId: projeto.id,
            titulo: m.titulo,
            data: addDaysUtc(dataInicio, m.diasAposInicio),
            ordem: i,
          })),
        });
      }
    }

    await this.audit.log('projeto', projeto.id, 'criado', { nome: projeto.nome, modeloId: dto.modeloId });
    return projeto;
  }

  private async mustFind(id: string) {
    const { userId } = getRequestContext();
    const projeto = await this.db().projeto.findFirst({ where: { id, participantes: { some: { userId } } } });
    if (!projeto) throw new NotFoundException('Projeto não encontrado.');
    return projeto;
  }

  async update(id: string, dto: UpdateProjetoDto) {
    await this.mustFind(id);
    const updated = await this.db().projeto.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        dataInicio: dto.dataInicio ? startOfDayUtc(dto.dataInicio) : undefined,
        dataFim: dto.dataFim ? startOfDayUtc(dto.dataFim) : undefined,
        status: dto.status,
        cor: dto.cor,
        wipLimiteEmAndamento: dto.wipLimiteEmAndamento,
      },
    });
    await this.audit.log('projeto', id, 'editado', { ...dto });
    return updated;
  }

  async delete(id: string) {
    const { userId } = getRequestContext();
    const projeto = await this.mustFind(id);
    if (projeto.criadoPorId !== userId) throw new ForbiddenException('Só quem criou o projeto pode excluí-lo.');
    await this.db().projeto.delete({ where: { id } });
    await this.audit.log('projeto', id, 'excluido', { nome: projeto.nome });
    return { ok: true };
  }

  async setParticipantes(id: string, dto: SetParticipantesDto) {
    const { tenantId } = getRequestContext();
    const projeto = await this.mustFind(id);
    const db = this.db();
    const idsFinais = [...new Set([projeto.criadoPorId, ...dto.participanteIds])];
    await db.projetoParticipante.deleteMany({ where: { projetoId: id } });
    await db.projetoParticipante.createMany({ data: idsFinais.map((uid) => ({ tenantId, projetoId: id, userId: uid })) });
    await this.audit.log('projeto', id, 'participantes_atualizados', { participanteIds: idsFinais });
    return { ok: true };
  }

  async listTarefas(id: string) {
    await this.mustFind(id);
    return this.db().agendaItem.findMany({
      where: { projetoId: id, deletedAt: null },
      include: { categoria: true, lembretes: { where: { enviado: false }, select: { antecedenciaDias: true, notificarEmail: true } } },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  async listAuditoria(id: string) {
    await this.mustFind(id);
    return this.audit.listForEntity('projeto', id);
  }

  /** Lead time / throughput calculados a partir da trilha de auditoria (criado→concluido) — sem campo novo no schema. */
  async metricas(id: string) {
    await this.mustFind(id);
    const db = this.db();
    const tarefas = await db.agendaItem.findMany({ where: { projetoId: id, deletedAt: null }, select: { id: true, concluida: true } });
    const ids = tarefas.map((t) => t.id);
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.concluida).length;
    if (ids.length === 0) return { total: 0, concluidas: 0, leadTimeMedioDias: null, throughputUltimos7Dias: 0 };

    const eventos = await db.auditEvent.findMany({
      where: { entityType: 'agenda_item', entityId: { in: ids }, action: { in: ['criado', 'concluido'] } },
      select: { entityId: true, action: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const criadoPorId = new Map<string, Date>();
    const concluidoPorId = new Map<string, Date>();
    for (const e of eventos) {
      if (e.action === 'criado' && !criadoPorId.has(e.entityId)) criadoPorId.set(e.entityId, e.createdAt);
      if (e.action === 'concluido') concluidoPorId.set(e.entityId, e.createdAt);
    }

    const leadTimesDias: number[] = [];
    for (const [itemId, dataConcluido] of concluidoPorId) {
      const dataCriado = criadoPorId.get(itemId);
      if (dataCriado) leadTimesDias.push((dataConcluido.getTime() - dataCriado.getTime()) / 86_400_000);
    }
    const leadTimeMedioDias = leadTimesDias.length > 0 ? Math.round((leadTimesDias.reduce((a, b) => a + b, 0) / leadTimesDias.length) * 10) / 10 : null;

    const seteDiasAtras = Date.now() - 7 * 86_400_000;
    const throughputUltimos7Dias = [...concluidoPorId.values()].filter((d) => d.getTime() >= seteDiasAtras).length;

    return { total, concluidas, leadTimeMedioDias, throughputUltimos7Dias };
  }

  async listMarcos(id: string) {
    await this.mustFind(id);
    return this.db().projetoMarco.findMany({ where: { projetoId: id }, orderBy: [{ data: 'asc' }, { ordem: 'asc' }] });
  }

  async criarMarco(id: string, dto: CreateMarcoDto) {
    await this.mustFind(id);
    const { tenantId } = getRequestContext();
    const db = this.db();
    const ultimo = await db.projetoMarco.findFirst({ where: { projetoId: id }, orderBy: { ordem: 'desc' } });
    const marco = await db.projetoMarco.create({
      data: { tenantId, projetoId: id, titulo: dto.titulo, data: startOfDayUtc(dto.data), ordem: (ultimo?.ordem ?? -1) + 1 },
    });
    await this.audit.log('projeto', id, 'marco_criado', { marcoId: marco.id, titulo: marco.titulo });
    return marco;
  }

  async atualizarMarco(id: string, marcoId: string, dto: UpdateMarcoDto) {
    await this.mustFind(id);
    const db = this.db();
    const { count } = await db.projetoMarco.updateMany({
      where: { id: marcoId, projetoId: id },
      data: { titulo: dto.titulo, data: dto.data ? startOfDayUtc(dto.data) : undefined, concluido: dto.concluido },
    });
    if (count === 0) throw new NotFoundException('Marco não encontrado.');
    await this.audit.log('projeto', id, 'marco_atualizado', { marcoId, ...dto });
    return db.projetoMarco.findUniqueOrThrow({ where: { id: marcoId } });
  }

  async excluirMarco(id: string, marcoId: string) {
    await this.mustFind(id);
    const { count } = await this.db().projetoMarco.deleteMany({ where: { id: marcoId, projetoId: id } });
    if (count === 0) throw new NotFoundException('Marco não encontrado.');
    await this.audit.log('projeto', id, 'marco_excluido', { marcoId });
    return { ok: true };
  }

  async listModelos() {
    const { tenantId } = getRequestContext();
    return this.db().projetoModelo.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async salvarComoModelo(id: string, dto: SalvarComoModeloDto) {
    const projeto = await this.mustFind(id);
    const { tenantId, userId } = getRequestContext();
    const db = this.db();
    const [tarefas, marcos] = await Promise.all([
      db.agendaItem.findMany({ where: { projetoId: id, deletedAt: null }, select: { descricao: true, data: true } }),
      db.projetoMarco.findMany({ where: { projetoId: id }, select: { titulo: true, data: true } }),
    ]);
    const salvo = await db.projetoModelo.create({
      data: {
        tenantId,
        nome: dto.nome,
        cor: projeto.cor,
        criadoPorId: userId,
        tarefas: tarefas.map((t) => ({ titulo: t.descricao, diasAposInicio: diasEntre(projeto.dataInicio, t.data) })),
        marcos: marcos.map((m) => ({ titulo: m.titulo, diasAposInicio: diasEntre(projeto.dataInicio, m.data) })),
      },
    });
    await this.audit.log('projeto_modelo', salvo.id, 'criado', { nome: salvo.nome, projetoOrigemId: id });
    return salvo;
  }

  async excluirModelo(modeloId: string) {
    const { tenantId, userId } = getRequestContext();
    const modelo = await this.db().projetoModelo.findFirst({ where: { id: modeloId, tenantId } });
    if (!modelo) throw new NotFoundException('Modelo não encontrado.');
    if (modelo.criadoPorId !== userId) throw new ForbiddenException('Só quem criou o modelo pode excluí-lo.');
    await this.db().projetoModelo.delete({ where: { id: modeloId } });
    await this.audit.log('projeto_modelo', modeloId, 'excluido', { nome: modelo.nome });
    return { ok: true };
  }
}
