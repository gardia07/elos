import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { calcularAvisoPrevio, calcularDataPagamento } from '../../rh/terminations/aviso-previo.util';
import { itemVisivelPara } from '../../agenda/visibility.util';

export type AgendaGeralOrigem =
  | 'AGENDA_ITEM'
  | 'LABOR_DEADLINE'
  | 'OCCUPATIONAL_EXAM'
  | 'NR_TRAINING'
  | 'VACATION_REQUEST'
  | 'TERMINATION'
  | 'TERMINATION_AVISO_FIM'
  | 'TERMINATION_PAGAMENTO'
  | 'DOCUMENT_REQUIREMENT'
  | 'ANIVERSARIO_COLABORADOR'
  | 'ANIVERSARIO_ADMISSAO';

/** Origens sem um campo de conclusão real no registro de origem — o check aqui só "dispensa" o lembrete (AgendaDismissal), não altera o registro. */
const ORIGENS_DISPENSAVEIS: AgendaGeralOrigem[] = [
  'OCCUPATIONAL_EXAM',
  'NR_TRAINING',
  'VACATION_REQUEST',
  'TERMINATION',
  'TERMINATION_AVISO_FIM',
  'TERMINATION_PAGAMENTO',
  'DOCUMENT_REQUIREMENT',
];

/**
 * Origens que espelham dados de módulos restritos a RH/gestão (DP, SST,
 * Gestão de Pessoas) — só entram no feed agregado para papéis que já têm
 * acesso a esses módulos de origem. AGENDA_ITEM é sempre pessoal (filtrado
 * por userId) e por isso nunca é restringido aqui.
 */
const ORIGENS_RESTRITAS_A_RH: AgendaGeralOrigem[] = [
  'LABOR_DEADLINE',
  'OCCUPATIONAL_EXAM',
  'NR_TRAINING',
  'VACATION_REQUEST',
  'TERMINATION',
  'TERMINATION_AVISO_FIM',
  'TERMINATION_PAGAMENTO',
  'DOCUMENT_REQUIREMENT',
  'ANIVERSARIO_COLABORADOR',
  'ANIVERSARIO_ADMISSAO',
];
const PAPEIS_RH = new Set(['ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA']);

export interface AgendaGeralEvento {
  id: string;
  origem: AgendaGeralOrigem;
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
  concluida: boolean;
  hora?: string | null;
  tipo?: string;
  notas?: string | null;
  categoriaId?: string | null;
  recorrenciaId?: string | null;
  responsavelId?: string | null;
  projetoId?: string | null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Próxima ocorrência (mês/dia de `base`) a partir de `today`, em UTC — usado para aniversário e tempo de empresa, que se repetem todo ano. */
function nextOccurrence(base: Date, today: Date): Date {
  let candidate = new Date(Date.UTC(today.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  if (candidate.getTime() < today.getTime()) {
    candidate = new Date(Date.UTC(today.getUTCFullYear() + 1, base.getUTCMonth(), base.getUTCDate()));
  }
  return candidate;
}

function bucketFor(date: Date, today: Date): AgendaGeralEvento['bucket'] {
  const dias = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'hoje';
  if (dias <= 7) return 'semana';
  if (dias <= 30) return 'mes';
  return 'futuro';
}

function startOfDayUtc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AgendaGeralService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list(data?: string) {
    const db = this.db();
    const { userId, role } = getRequestContext();
    const podeVerOrigensRh = PAPEIS_RH.has(role);
    const now = new Date();
    // Datas de origem (AgendaItem.data, LaborDeadline.vencimento etc.) são
    // gravadas como meia-noite UTC do dia informado pelo usuário — "hoje"
    // precisa usar a mesma convenção, senão o fuso do servidor desalinha a
    // comparação e itens de hoje somem da visão geral.
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const dismissals = await db.agendaDismissal.findMany({ where: { userId } });
    const dismissedSet = new Set(dismissals.map((d) => `${d.origem}:${d.sourceId}`));
    const isDismissed = (origem: AgendaGeralOrigem, id: string) => dismissedSet.has(`${origem}:${id}`);

    const diaUnico = data ? startOfDayUtc(data) : null;
    const janela = diaUnico ?? new Date(today.getTime() + 90 * 86_400_000);
    const rangeAgendaItem = diaUnico ? { data: diaUnico } : { data: { gte: today } };
    const rangeDeadline = diaUnico ? { vencimento: diaUnico } : { vencimento: { lte: janela } };
    const rangeExam = diaUnico ? { dataPrevista: diaUnico } : { dataPrevista: { lte: janela } };
    const rangeVacation = diaUnico ? { inicio: diaUnico } : { inicio: { gte: today, lte: janela } };
    const rangeTermination = diaUnico ? { data: diaUnico } : { data: { lte: janela } };
    const rangeDocReq = diaUnico ? { expiraEm: diaUnico } : { expiraEm: { not: null, lte: janela } };
    const visivel = await itemVisivelPara(db, userId);

    const [agendaItems, deadlines, exams, trainings, vacations, terminationsAbertas, terminations, docRequirements, employeesAniversario] = await Promise.all([
      db.agendaItem.findMany({
        where: { ...visivel, deletedAt: null, ...(diaUnico ? {} : { concluida: false }), ...rangeAgendaItem },
      }),
      podeVerOrigensRh
        ? db.laborDeadline.findMany({ where: { ...(diaUnico ? {} : { cumprido: false }), ...rangeDeadline } })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.occupationalExam.findMany({
            where: { ...(diaUnico ? {} : { resultado: null }), ...rangeExam },
            include: { employee: { select: { nome: true } } },
          })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.nrTrainingRecord.findMany({ include: { employee: { select: { nome: true } } } })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.vacationRequest.findMany({
            where: { status: 'APROVADA', ...rangeVacation },
            include: { employee: { select: { nome: true } } },
          })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.termination.findMany({
            where: { status: { notIn: ['CONCLUIDO', 'CANCELADO'] } },
            include: { employee: { select: { nome: true, dataAdmissao: true } } },
          })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.termination.findMany({
            where: { ...(diaUnico ? {} : { status: 'EM_ANDAMENTO' }), ...rangeTermination },
            include: { employee: { select: { nome: true } } },
          })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.employeeDocumentRequirement.findMany({
            where: { status: { in: ['MISSING', 'PENDING', 'EXPIRED'] }, ...rangeDocReq },
            include: { employee: { select: { nome: true } }, requirement: { select: { nome: true } } },
          })
        : Promise.resolve([]),
      podeVerOrigensRh
        ? db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, nome: true, dataNascimento: true, dataAdmissao: true } })
        : Promise.resolve([]),
    ]);

    const eventos: AgendaGeralEvento[] = [];

    for (const a of agendaItems) {
      eventos.push({
        id: a.id,
        origem: 'AGENDA_ITEM',
        data: a.data.toISOString(),
        titulo: a.descricao,
        hub: 'Área de trabalho',
        bucket: bucketFor(a.data, today),
        concluida: a.concluida,
        hora: a.hora,
        tipo: a.tipo,
        notas: a.notas,
        categoriaId: a.categoriaId,
        recorrenciaId: a.recorrenciaId,
        responsavelId: a.responsavelId,
        projetoId: a.projetoId,
      });
    }
    for (const d of deadlines) {
      eventos.push({
        id: d.id,
        origem: 'LABOR_DEADLINE',
        data: d.vencimento.toISOString(),
        titulo: `Prazo: ${d.obrigacao}`,
        hub: 'DP',
        bucket: bucketFor(d.vencimento, today),
        concluida: d.cumprido,
      });
    }
    for (const e of exams) {
      if (isDismissed('OCCUPATIONAL_EXAM', e.id)) continue;
      eventos.push({
        id: e.id,
        origem: 'OCCUPATIONAL_EXAM',
        data: e.dataPrevista.toISOString(),
        titulo: `Exame ocupacional — ${e.employee.nome}`,
        hub: 'SST',
        bucket: bucketFor(e.dataPrevista, today),
        concluida: false,
      });
    }
    for (const t of trainings) {
      const vencimento = addMonths(t.dataRealizacao, t.validadeMeses);
      if (diaUnico ? vencimento.getTime() !== diaUnico.getTime() : vencimento > janela) continue;
      if (isDismissed('NR_TRAINING', t.id)) continue;
      eventos.push({
        id: t.id,
        origem: 'NR_TRAINING',
        data: vencimento.toISOString(),
        titulo: `${t.curso} vence — ${t.employee.nome}`,
        hub: 'SST',
        bucket: bucketFor(vencimento, today),
        concluida: false,
      });
    }
    for (const v of vacations) {
      if (isDismissed('VACATION_REQUEST', v.id)) continue;
      eventos.push({
        id: v.id,
        origem: 'VACATION_REQUEST',
        data: v.inicio.toISOString(),
        titulo: `Início de férias — ${v.employee.nome}`,
        hub: 'Gestão de Pessoas',
        bucket: bucketFor(v.inicio, today),
        concluida: false,
      });
    }
    for (const t of terminations) {
      if (isDismissed('TERMINATION', t.id)) continue;
      eventos.push({
        id: t.id,
        origem: 'TERMINATION',
        data: t.data.toISOString(),
        titulo: `Desligamento — ${t.employee.nome}`,
        hub: 'Gestão de Pessoas',
        bucket: bucketFor(t.data, today),
        concluida: t.status === 'CONCLUIDO',
      });
    }
    for (const r of docRequirements) {
      if (!r.expiraEm) continue;
      if (isDismissed('DOCUMENT_REQUIREMENT', r.id)) continue;
      eventos.push({
        id: r.id,
        origem: 'DOCUMENT_REQUIREMENT',
        data: r.expiraEm.toISOString(),
        titulo: `Documentação pendente: ${r.requirement.nome} — ${r.employee.nome}`,
        hub: 'Gestão de Pessoas',
        bucket: bucketFor(r.expiraEm, today),
        concluida: false,
      });
    }

    for (const e of employeesAniversario) {
      if (e.dataNascimento) {
        const alvo = nextOccurrence(e.dataNascimento, today);
        const dentroDaJanela = diaUnico ? alvo.getTime() === diaUnico.getTime() : alvo.getTime() <= janela.getTime();
        if (dentroDaJanela) {
          eventos.push({
            id: `${e.id}-nascimento`,
            origem: 'ANIVERSARIO_COLABORADOR',
            data: alvo.toISOString(),
            titulo: `Aniversário — ${e.nome}`,
            hub: 'Gestão de Pessoas',
            bucket: bucketFor(alvo, today),
            concluida: false,
          });
        }
      }

      const alvoAdmissao = nextOccurrence(e.dataAdmissao, today);
      const anos = alvoAdmissao.getUTCFullYear() - e.dataAdmissao.getUTCFullYear();
      const dentroDaJanelaAdmissao = diaUnico ? alvoAdmissao.getTime() === diaUnico.getTime() : alvoAdmissao.getTime() <= janela.getTime();
      if (anos >= 1 && dentroDaJanelaAdmissao) {
        eventos.push({
          id: `${e.id}-admissao`,
          origem: 'ANIVERSARIO_ADMISSAO',
          data: alvoAdmissao.toISOString(),
          titulo: `${anos} ${anos === 1 ? 'ano' : 'anos'} de empresa — ${e.nome}`,
          hub: 'Gestão de Pessoas',
          bucket: bucketFor(alvoAdmissao, today),
          concluida: false,
        });
      }
    }

    for (const t of terminationsAbertas) {
      const { fim } = calcularAvisoPrevio(t.employee.dataAdmissao, t.data, t.avisoPrevioInicio);
      const fimDentroDaJanela = diaUnico ? fim.getTime() === diaUnico.getTime() : fim <= janela;
      // ids com sufixo (não o t.id puro) — duas origens diferentes derivadas da mesma
      // rescisão precisam de ids distintos, senão colidem como key/dismissal no front.
      if (fimDentroDaJanela && !isDismissed('TERMINATION_AVISO_FIM', `${t.id}-aviso-fim`)) {
        eventos.push({
          id: `${t.id}-aviso-fim`,
          origem: 'TERMINATION_AVISO_FIM',
          data: fim.toISOString(),
          titulo: `Fim do aviso prévio — ${t.employee.nome}`,
          hub: 'Gestão de Pessoas',
          bucket: bucketFor(fim, today),
          concluida: false,
        });
      }

      const dataPagamento = calcularDataPagamento(t.data);
      const pagamentoDentroDaJanela = diaUnico ? dataPagamento.getTime() === diaUnico.getTime() : dataPagamento <= janela;
      if (pagamentoDentroDaJanela && !isDismissed('TERMINATION_PAGAMENTO', `${t.id}-pagamento`)) {
        eventos.push({
          id: `${t.id}-pagamento`,
          origem: 'TERMINATION_PAGAMENTO',
          data: dataPagamento.toISOString(),
          titulo: `Prazo de pagamento da rescisão — ${t.employee.nome}`,
          hub: 'Gestão de Pessoas',
          bucket: bucketFor(dataPagamento, today),
          concluida: false,
        });
      }
    }

    return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  async concluir(origem: AgendaGeralOrigem, id: string) {
    const { userId, tenantId, role } = getRequestContext();
    const db = this.db();

    if (ORIGENS_RESTRITAS_A_RH.includes(origem) && !PAPEIS_RH.has(role)) {
      return { ok: false };
    }

    if (origem === 'AGENDA_ITEM') {
      const visivel = await itemVisivelPara(db, userId);
      const item = await db.agendaItem.findFirst({ where: { id, tenantId, deletedAt: null, ...visivel } });
      if (item) await db.agendaItem.update({ where: { id }, data: { concluida: true } });
      return { ok: true };
    }
    if (origem === 'LABOR_DEADLINE') {
      await db.laborDeadline.update({ where: { id }, data: { cumprido: true } });
      return { ok: true };
    }
    if (ORIGENS_DISPENSAVEIS.includes(origem)) {
      await db.agendaDismissal.upsert({
        where: { tenantId_userId_origem_sourceId: { tenantId, userId, origem, sourceId: id } },
        create: { tenantId, userId, origem, sourceId: id },
        update: {},
      });
      return { ok: true };
    }
    return { ok: false };
  }
}
