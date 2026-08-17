import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateProjetoDto, SetParticipantesDto, UpdateProjetoDto } from './dto/projetos.dto';

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class ProjetosService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const projetos = await db.projeto.findMany({
      where: { participantes: { some: { userId } } },
      include: { participantes: true, tarefas: { where: { deletedAt: null }, select: { concluida: true } } },
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
      const atrasado = !!p.dataFim && p.dataFim.getTime() < hojeUtc.getTime() && p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO';
      return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        dataInicio: p.dataInicio,
        dataFim: p.dataFim,
        status: p.status,
        cor: p.cor,
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
    return db.projeto.create({
      data: {
        tenantId,
        nome: dto.nome,
        descricao: dto.descricao,
        dataInicio: startOfDayUtc(dto.dataInicio),
        dataFim: dto.dataFim ? startOfDayUtc(dto.dataFim) : undefined,
        cor: dto.cor,
        criadoPorId: userId,
        participantes: { createMany: { data: [...participanteIds].map((id) => ({ tenantId, userId: id })) } },
      },
    });
  }

  private async mustFind(id: string) {
    const { userId } = getRequestContext();
    const projeto = await this.db().projeto.findFirst({ where: { id, participantes: { some: { userId } } } });
    if (!projeto) throw new NotFoundException('Projeto não encontrado.');
    return projeto;
  }

  async update(id: string, dto: UpdateProjetoDto) {
    await this.mustFind(id);
    return this.db().projeto.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        dataInicio: dto.dataInicio ? startOfDayUtc(dto.dataInicio) : undefined,
        dataFim: dto.dataFim ? startOfDayUtc(dto.dataFim) : undefined,
        status: dto.status,
        cor: dto.cor,
      },
    });
  }

  async delete(id: string) {
    const { userId } = getRequestContext();
    const projeto = await this.mustFind(id);
    if (projeto.criadoPorId !== userId) throw new ForbiddenException('Só quem criou o projeto pode excluí-lo.');
    await this.db().projeto.delete({ where: { id } });
    return { ok: true };
  }

  async setParticipantes(id: string, dto: SetParticipantesDto) {
    const { tenantId } = getRequestContext();
    const projeto = await this.mustFind(id);
    const db = this.db();
    const idsFinais = [...new Set([projeto.criadoPorId, ...dto.participanteIds])];
    await db.projetoParticipante.deleteMany({ where: { projetoId: id } });
    await db.projetoParticipante.createMany({ data: idsFinais.map((uid) => ({ tenantId, projetoId: id, userId: uid })) });
    return { ok: true };
  }

  async listTarefas(id: string) {
    await this.mustFind(id);
    return this.db().agendaItem.findMany({
      where: { projetoId: id, deletedAt: null },
      include: { categoria: true },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }
}
