import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { DashboardService } from '../dashboard/dashboard.service';
import { AgendaService } from '../agenda/agenda.service';
import { AprovacoesService } from '../aprovacoes/aprovacoes.service';
import { itemVisivelPara } from '../agenda/visibility.util';
import { CriarTarefaManualDto } from './dto/tarefas-do-dia.dto';

export type TarefaOrigem = 'TASK' | 'AGENDA' | 'APROVACAO';
const ORIGENS_VALIDAS: TarefaOrigem[] = ['TASK', 'AGENDA', 'APROVACAO'];

export interface TarefaDoDia {
  id: string;
  origem: TarefaOrigem;
  origemId: string;
  titulo: string;
  hub: string;
  prazo: string | null;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  concluida: boolean;
  fixada: boolean;
  score: number;
  href: string | null;
  delegadoPara: { userId: string; nome: string } | null;
  podeConcluir: boolean;
  podeAdiar: boolean;
  podeDelegar: boolean;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Peso do risco de compliance: reaproveita a mesma prioridade já atribuída
// pela origem (Task/Agenda/Aprovação), só normalizada pra uma escala comum.
const COMPLIANCE_PESO: Record<string, number> = { CRITICA: 30, ALTA: 22, MEDIA: 12, BAIXA: 4 };

// Abrangência: heurística por hub -- SST/DP/Compliance representam
// obrigações legais que afetam a empresa toda, RH afeta um grupo de
// colaboradores, o resto (Agenda pessoal, Área de trabalho) afeta só quem
// criou o item. Não há contagem real de "pessoas afetadas" no schema hoje.
const HUB_ABRANGENCIA: Record<string, number> = {
  SST: 20,
  DP: 20,
  COMPLIANCE: 20,
  RH: 12,
  'Gestão de Pessoas': 12,
  PAINEL: 4,
  Agenda: 4,
};

function scoreAbrangencia(hub: string): number {
  return HUB_ABRANGENCIA[hub] ?? 6;
}

function scorePrazo(prazo: Date | null, hojeUtc: Date): number {
  if (!prazo) return 0;
  const dias = Math.round((startOfUtcDay(prazo).getTime() - hojeUtc.getTime()) / 86_400_000);
  if (dias < 0) return 40;
  if (dias === 0) return 35;
  if (dias <= 3) return 25;
  if (dias <= 7) return 15;
  return 5;
}

function assertOrigemValida(origem: string): asserts origem is TarefaOrigem {
  if (!ORIGENS_VALIDAS.includes(origem as TarefaOrigem)) throw new BadRequestException('Origem inválida.');
}

const LIMITE_LISTA = 6;

@Injectable()
export class TarefasDoDiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly agenda: AgendaService,
    private readonly aprovacoes: AprovacoesService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private async agendaItemsPendentes(hojeUtc: Date) {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const visivel = await itemVisivelPara(db, userId);
    return db.agendaItem.findMany({
      where: { tenantId, deletedAt: null, concluida: false, data: { lte: hojeUtc }, ...visivel },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  private async contarConcluidasHoje(hojeUtc: Date) {
    const amanhaUtc = new Date(hojeUtc.getTime() + 86_400_000);
    const { userId } = getRequestContext();
    const db = this.db();
    const visivel = await itemVisivelPara(db, userId);

    const [tasksHoje, agendaHoje] = await Promise.all([
      db.task.findMany({ where: { prazo: { gte: hojeUtc, lt: amanhaUtc } }, select: { status: true } }),
      db.agendaItem.findMany({ where: { deletedAt: null, data: hojeUtc, ...visivel }, select: { concluida: true } }),
    ]);
    const total = tasksHoje.length + agendaHoje.length;
    const concluidas = tasksHoje.filter((t) => t.status === 'CONCLUIDA').length + agendaHoje.filter((a) => a.concluida).length;
    return { total, concluidas };
  }

  async list() {
    const { userId, tenantId } = getRequestContext();
    const db = this.db();
    const hojeUtc = startOfUtcDay(new Date());

    const [tasks, agendaItems, aprovacoesTodas, fixacoes, usuarios, contagemHoje] = await Promise.all([
      this.dashboard.tasks(),
      this.agendaItemsPendentes(hojeUtc),
      this.aprovacoes.list(),
      db.tarefaDoDiaFixacao.findMany({ where: { userId } }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.contarConcluidasHoje(hojeUtc),
    ]);

    const nomePorId = new Map(usuarios.map((u) => [u.id, u.name]));
    const fixadoSet = new Set(fixacoes.map((f) => `${f.origem}:${f.origemId}`));

    const itens: TarefaDoDia[] = [];

    for (const t of tasks) {
      const chave = `TASK:${t.id}`;
      itens.push({
        id: chave,
        origem: 'TASK',
        origemId: t.id,
        titulo: t.titulo,
        hub: t.modulo,
        prazo: t.prazo ? t.prazo.toISOString() : null,
        prioridade: t.prioridade,
        concluida: false,
        fixada: fixadoSet.has(chave),
        score: scorePrazo(t.prazo, hojeUtc) + COMPLIANCE_PESO[t.prioridade] + scoreAbrangencia(t.modulo),
        href: (t.detalhes as { href?: string } | null)?.href ?? null,
        delegadoPara: t.assignedUserId ? { userId: t.assignedUserId, nome: nomePorId.get(t.assignedUserId) ?? '—' } : null,
        podeConcluir: true,
        podeAdiar: true,
        podeDelegar: true,
      });
    }

    for (const item of agendaItems) {
      const chave = `AGENDA:${item.id}`;
      const prioridade: TarefaDoDia['prioridade'] =
        item.prioridade === 'P0' ? 'CRITICA' : item.prioridade === 'P1' ? 'ALTA' : item.prioridade === 'P2' ? 'MEDIA' : 'BAIXA';
      itens.push({
        id: chave,
        origem: 'AGENDA',
        origemId: item.id,
        titulo: item.descricao,
        hub: 'Agenda',
        prazo: item.data.toISOString(),
        prioridade,
        concluida: item.concluida,
        fixada: fixadoSet.has(chave),
        score: scorePrazo(item.data, hojeUtc) + COMPLIANCE_PESO[prioridade] + scoreAbrangencia('Agenda'),
        href: `/agenda?view=dia&data=${item.data.toISOString().slice(0, 10)}`,
        delegadoPara: item.responsavelId ? { userId: item.responsavelId, nome: nomePorId.get(item.responsavelId) ?? '—' } : null,
        podeConcluir: true,
        podeAdiar: true,
        podeDelegar: true,
      });
    }

    for (const a of aprovacoesTodas) {
      if (a.status !== 'PENDENTE') continue;
      const chave = `APROVACAO:${a.id}`;
      const prioridade: TarefaDoDia['prioridade'] = a.slaRisco ? 'ALTA' : a.prioridade === 'Alta' ? 'ALTA' : 'MEDIA';
      itens.push({
        id: chave,
        origem: 'APROVACAO',
        origemId: a.id,
        titulo: a.titulo,
        hub: a.hub,
        prazo: a.prazo,
        prioridade,
        concluida: false,
        fixada: fixadoSet.has(chave),
        score: scorePrazo(a.prazo ? new Date(a.prazo) : null, hojeUtc) + COMPLIANCE_PESO[prioridade] + scoreAbrangencia(a.hub),
        href: '/aprovacoes',
        delegadoPara: null,
        podeConcluir: false,
        podeAdiar: false,
        podeDelegar: false,
      });
    }

    // Fixadas sempre aparecem (nunca escondidas por uma escolha manual do
    // usuário), completando o restante das vagas com as de maior pontuação.
    const fixadas = itens.filter((i) => i.fixada).sort((a, b) => b.score - a.score);
    const naoFixadas = itens.filter((i) => !i.fixada).sort((a, b) => b.score - a.score);
    const vagas = Math.max(0, LIMITE_LISTA - fixadas.length);
    const selecionadas = [...fixadas, ...naoFixadas.slice(0, vagas)];

    return { itens: selecionadas, concluidasHoje: contagemHoje.concluidas, totalHoje: contagemHoje.total };
  }

  async criarManual(dto: CriarTarefaManualDto) {
    const hojeIso = new Date().toISOString().slice(0, 10);
    return this.dashboard.createTask({ titulo: dto.titulo, modulo: 'PAINEL', prioridade: 'MEDIA', prazo: hojeIso });
  }

  async concluir(origem: string, origemId: string) {
    assertOrigemValida(origem);
    if (origem === 'TASK') return this.dashboard.setTaskStatus(origemId, 'CONCLUIDA');
    if (origem === 'AGENDA') return this.agenda.updateItem(origemId, { concluida: true });
    throw new BadRequestException('Esse item não pode ser concluído por aqui — abra a origem.');
  }

  async adiar(origem: string, origemId: string, dias: number) {
    assertOrigemValida(origem);
    const hojeUtc = startOfUtcDay(new Date());
    const novaData = new Date(hojeUtc.getTime() + dias * 86_400_000);
    if (origem === 'TASK') return this.db().task.update({ where: { id: origemId }, data: { prazo: novaData } });
    if (origem === 'AGENDA') return this.agenda.updateItem(origemId, { data: novaData.toISOString().slice(0, 10) });
    throw new BadRequestException('Esse item não pode ser adiado por aqui.');
  }

  async delegar(origem: string, origemId: string, userId: string) {
    assertOrigemValida(origem);
    if (origem === 'TASK') return this.db().task.update({ where: { id: origemId }, data: { assignedUserId: userId } });
    if (origem === 'AGENDA') return this.agenda.updateItem(origemId, { responsavelId: userId });
    throw new BadRequestException('Esse item não pode ser delegado por aqui.');
  }

  async fixar(origem: string, origemId: string) {
    assertOrigemValida(origem);
    const { tenantId, userId } = getRequestContext();
    await this.db().tarefaDoDiaFixacao.upsert({
      where: { tenantId_userId_origem_origemId: { tenantId, userId, origem, origemId } },
      create: { tenantId, userId, origem, origemId },
      update: {},
    });
    return { ok: true };
  }

  async desfixar(origem: string, origemId: string) {
    assertOrigemValida(origem);
    const { tenantId, userId } = getRequestContext();
    await this.db().tarefaDoDiaFixacao.deleteMany({ where: { tenantId, userId, origem, origemId } });
    return { ok: true };
  }
}
