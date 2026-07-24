import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { ComplianceOverviewService } from '../compliance/overview.service';
import { DocumentsService } from '../rh/documents/documents.service';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDiasRestantes(alvo: Date, hoje: Date): string {
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
  if (dias < 0) return `há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'hoje';
  return `em ${dias} dia(s)`;
}

export interface Alert {
  hub: string;
  mensagem: string;
  alertKey: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  href: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceOverviewService,
    private readonly documents: DocumentsService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async kpis() {
    const db = this.db();

    const [colaboradoresAtivos, pontoPendente, feriasPendente, admissoesAbertas, desligamentosAbertos] = await Promise.all([
      db.employee.count({ where: { status: 'ATIVO' } }),
      db.timeJustification.count({ where: { status: 'PENDENTE' } }),
      db.vacationRequest.count({ where: { status: 'PENDENTE' } }),
      db.admission.count({ where: { status: { not: 'EFETIVADO' } } }),
      db.termination.count({ where: { status: 'EM_ANDAMENTO' } }),
    ]);
    const pendenciasAbertas = pontoPendente + feriasPendente + admissoesAbertas + desligamentosAbertos;

    await this.refreshTasks();
    const complianceOverview = await this.compliance.get();
    const { overall: conformidadeDocumental } = await this.documents.complianceOverview();
    // Um único índice para "a empresa inteira": documentação obrigatória dos
    // colaboradores + programa de ética/políticas, não dois números soltos.
    const conformidadeGeral = Math.round((conformidadeDocumental + complianceOverview.maturidade) / 2);
    const { riscoGeral, alertasCriticosAtivos } = await this.calcRisco();

    await Promise.all([
      this.captureSnapshot('COLABORADORES_ATIVOS', colaboradoresAtivos),
      this.captureSnapshot('PENDENCIAS_ABERTAS', pendenciasAbertas),
      this.captureSnapshot('CONFORMIDADE_GERAL', conformidadeGeral),
    ]);

    const [colaboradoresAnterior, pendenciasAnterior, conformidadeAnterior] = await Promise.all([
      this.valorMesAnterior('COLABORADORES_ATIVOS'),
      this.valorMesAnterior('PENDENCIAS_ABERTAS'),
      this.valorMesAnterior('CONFORMIDADE_GERAL'),
    ]);

    return {
      colaboradoresAtivos,
      colaboradoresAtivosDeltaPct:
        colaboradoresAnterior != null && colaboradoresAnterior > 0
          ? Math.round(((colaboradoresAtivos - colaboradoresAnterior) / colaboradoresAnterior) * 1000) / 10
          : null,
      pendenciasAbertas,
      pendenciasAbertasDelta: pendenciasAnterior != null ? pendenciasAbertas - pendenciasAnterior : null,
      conformidadeGeral,
      conformidadeGeralDelta: conformidadeAnterior != null ? conformidadeGeral - conformidadeAnterior : null,
      riscoGeral,
      alertasCriticosAtivos,
    };
  }

  async alerts(): Promise<Alert[]> {
    return this.refreshTasks();
  }

  private async refreshTasks(): Promise<Alert[]> {
    const alertas = await this.buildAlerts();
    await this.syncTasksFromAlerts(alertas);
    return alertas;
  }

  private async buildAlerts(): Promise<Alert[]> {
    const db = this.db();
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 86_400_000);
    const em60dias = new Date(hoje.getTime() + 60 * 86_400_000);

    const alerts: Alert[] = [];

    const [
      admissoesPendentes,
      prazosPendentes,
      colaboradoresFeriasVencendo,
      cctsSemReajuste,
      equipamentos,
      pontosPendentes,
      feriasSolicitadas,
      treinamentos,
      empregadosAtivos,
    ] = await Promise.all([
      db.admission.findMany({ where: { esocialSent: false, status: { not: 'EFETIVADO' } }, select: { id: true, nome: true } }),
      db.laborDeadline.count({ where: { cumprido: false, vencimento: { lte: em30dias } } }),
      db.employee.findMany({ where: { status: 'ATIVO', feriasVencimento: { lte: em60dias } }, select: { id: true, nome: true, feriasVencimento: true } }),
      db.collectiveAgreement.count({ where: { reajusteAplicadoEm: null, vigenciaFim: { gte: hoje } } }),
      db.equipmentItem.findMany({ select: { id: true, item: true, entregaEm: true, validadeMeses: true, employeeId: true, employee: { select: { nome: true } } } }),
      db.timeJustification.findMany({ where: { status: 'PENDENTE' }, select: { id: true, data: true, ocorrencia: true, employeeId: true, employee: { select: { nome: true } } } }),
      db.vacationRequest.findMany({ where: { status: 'PENDENTE' }, select: { id: true, inicio: true, employeeId: true, employee: { select: { nome: true } } } }),
      db.nrTrainingRecord.findMany({ select: { id: true, curso: true, dataRealizacao: true, validadeMeses: true, employeeId: true, employee: { select: { nome: true } } } }),
      db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, nome: true } }),
    ]);

    // Alertas por pessoa/registro — nome de quem precisa da ação e link direto
    // para a página onde ela é resolvida, em vez de uma contagem agregada.
    for (const admissao of admissoesPendentes) {
      alerts.push({
        hub: 'DP',
        alertKey: `dp-esocial-s2200-pendente-${admissao.id}`,
        prioridade: 'ALTA',
        mensagem: `Envio do evento eSocial S-2200 pendente para ${admissao.nome}`,
        href: `/gestao-de-pessoas/admissao/${admissao.id}`,
      });
    }
    if (prazosPendentes > 0) {
      alerts.push({
        hub: 'DP',
        alertKey: 'dp-prazos-trabalhistas',
        prioridade: 'ALTA',
        mensagem: `${prazosPendentes} prazo(s) trabalhista(s) vencendo nos próximos 30 dias`,
        href: '/dp/prazos',
      });
    }
    for (const colaborador of colaboradoresFeriasVencendo) {
      alerts.push({
        hub: 'RH',
        alertKey: `rh-ferias-vencendo-${colaborador.id}`,
        prioridade: 'MEDIA',
        mensagem: `${colaborador.nome} — período aquisitivo de férias vence em ${formatDiasRestantes(colaborador.feriasVencimento, hoje)}`,
        href: `/gestao-de-pessoas/colaboradores/${colaborador.id}`,
      });
    }
    if (cctsSemReajuste > 0) {
      alerts.push({
        hub: 'DP',
        alertKey: 'dp-cct-sem-reajuste',
        prioridade: 'MEDIA',
        mensagem: `${cctsSemReajuste} convenção(ões) coletiva(s) vigente(s) com reajuste ainda não aplicado`,
        href: '/dp/cct',
      });
    }

    const epiVencidoOuVencendo = equipamentos.filter((e) => {
      const vencimento = addMonths(e.entregaEm, e.validadeMeses);
      const diasRestantes = Math.round((vencimento.getTime() - hoje.getTime()) / 86_400_000);
      return diasRestantes <= 30;
    });
    for (const e of epiVencidoOuVencendo) {
      alerts.push({
        hub: 'DP',
        alertKey: `dp-epi-vencendo-${e.id}`,
        prioridade: 'BAIXA',
        mensagem: `${e.employee.nome} — ${e.item} vencido ou vencendo`,
        href: e.employeeId ? `/gestao-de-pessoas/colaboradores/${e.employeeId}` : '/dp/uniforme',
      });
    }
    for (const p of pontosPendentes) {
      alerts.push({
        hub: 'DP',
        alertKey: `dp-ponto-pendente-${p.id}`,
        prioridade: 'MEDIA',
        mensagem: `${p.employee.nome} — ocorrência de ponto (${p.ocorrencia}) aguardando justificativa`,
        href: '/dp/ponto',
      });
    }

    for (const f of feriasSolicitadas) {
      alerts.push({
        hub: 'RH',
        alertKey: `rh-ferias-pendente-${f.id}`,
        prioridade: 'MEDIA',
        mensagem: `${f.employee.nome} — solicitação de férias aguardando aprovação`,
        href: `/gestao-de-pessoas/colaboradores/${f.employeeId}`,
      });
    }

    for (const t of treinamentos) {
      const vencimento = addMonths(t.dataRealizacao, t.validadeMeses);
      const diasRestantes = Math.round((vencimento.getTime() - hoje.getTime()) / 86_400_000);
      if (diasRestantes > 30) continue;
      alerts.push({
        hub: 'SST',
        alertKey: `sst-treinamento-vencendo-${t.id}`,
        prioridade: diasRestantes < 0 ? 'ALTA' : 'MEDIA',
        mensagem: `${t.employee.nome} — treinamento ${t.curso} ${diasRestantes < 0 ? 'vencido' : 'vencendo'} (${formatDiasRestantes(vencimento, hoje)})`,
        href: '/sst/treinamentos-nr',
      });
    }

    // Documentação obrigatória incompleta (CLT + requisitos configurados),
    // um alerta por colaborador que ainda não está 100% conforme.
    const { byEmployee: conformidadePorEmployee } = await this.documents.complianceOverview(empregadosAtivos.map((e) => e.id));
    for (const empregado of empregadosAtivos) {
      const conformidade = conformidadePorEmployee[empregado.id] ?? 100;
      if (conformidade >= 100) continue;
      alerts.push({
        hub: 'RH',
        alertKey: `rh-documentacao-incompleta-${empregado.id}`,
        prioridade: conformidade < 50 ? 'ALTA' : 'MEDIA',
        mensagem: `${empregado.nome} — documentação/cadastro ${conformidade}% conforme`,
        href: `/gestao-de-pessoas/colaboradores/${empregado.id}?tab=documentos`,
      });
    }

    return alerts;
  }

  /**
   * Persists computed alerts as Task rows keyed by alertKey, so they survive
   * a page reload, can be assigned/dismissed, and show up alongside manually
   * created tasks. Reopens a task that was marked done if the underlying
   * condition still holds, and auto-closes system tasks whose condition
   * cleared. Manual tasks (origem = 'MANUAL') are never touched here.
   */
  private async syncTasksFromAlerts(alerts: Alert[]) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const currentKeys = alerts.map((a) => a.alertKey);

    for (const alert of alerts) {
      const existing = await db.task.findUnique({ where: { tenantId_alertKey: { tenantId, alertKey: alert.alertKey } } });
      const detalhes = { href: alert.href };
      if (!existing) {
        await db.task.create({
          data: {
            tenantId,
            modulo: alert.hub,
            titulo: alert.mensagem,
            prioridade: alert.prioridade,
            origem: 'SISTEMA',
            alertKey: alert.alertKey,
            detalhes,
          },
        });
      } else if (existing.titulo !== alert.mensagem || existing.prioridade !== alert.prioridade || existing.status === 'CONCLUIDA') {
        await db.task.update({
          where: { id: existing.id },
          data: { titulo: alert.mensagem, prioridade: alert.prioridade, status: 'ABERTA', detalhes },
        });
      }
    }

    await db.task.updateMany({
      where: { tenantId, origem: 'SISTEMA', status: 'ABERTA', alertKey: { notIn: currentKeys.length ? currentKeys : ['__none__'] } },
      data: { status: 'CONCLUIDA' },
    });
  }

  async tasks() {
    await this.refreshTasks();
    return this.db().task.findMany({
      where: { status: 'ABERTA' },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createTask(input: { titulo: string; modulo: string; prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'; prazo?: string }) {
    const { tenantId } = getRequestContext();
    return this.db().task.create({
      data: {
        tenantId,
        titulo: input.titulo,
        modulo: input.modulo,
        prioridade: input.prioridade ?? 'MEDIA',
        origem: 'MANUAL',
        prazo: input.prazo ? new Date(input.prazo) : undefined,
      },
    });
  }

  async setTaskStatus(id: string, status: 'ABERTA' | 'CONCLUIDA') {
    return this.db().task.update({ where: { id }, data: { status } });
  }

  /**
   * Risco geral: heurística simplificada combinando sinais de SST (mapa de
   * riscos, acidentes em análise), Compliance (casos éticos graves em aberto)
   * e DP (prazos trabalhistas já vencidos) — não é um score atuarial formal.
   */
  private async calcRisco() {
    const db = this.db();
    const hoje = new Date();

    const [alertasCriticosAtivos, riscosAltoMapa, acidentesAbertos, casosEticaGravesAbertos, prazosVencidos] = await Promise.all([
      db.task.count({ where: { status: 'ABERTA', prioridade: { in: ['ALTA', 'CRITICA'] } } }),
      db.riskMapEntry.count({ where: { nivel: 'ALTO' } }),
      db.accident.count({ where: { status: 'EM_ANALISE' } }),
      db.ethicsCase.count({ where: { status: { in: ['ABERTO', 'EM_INVESTIGACAO'] }, categoria: { in: ['ASSEDIO', 'FRAUDE', 'DISCRIMINACAO'] } } }),
      db.laborDeadline.count({ where: { cumprido: false, vencimento: { lt: hoje } } }),
    ]);

    const score = riscosAltoMapa + acidentesAbertos * 2 + casosEticaGravesAbertos * 2 + prazosVencidos * 2;
    const riscoGeral = score === 0 ? 'Baixo' : score <= 3 ? 'Médio' : 'Alto';
    return { riscoGeral, alertasCriticosAtivos };
  }

  private async captureSnapshot(metrica: string, valor: number) {
    const { tenantId } = getRequestContext();
    const data = startOfUtcDay(new Date());
    await this.db().metricSnapshot.upsert({
      where: { tenantId_metrica_data: { tenantId, metrica, data } },
      create: { tenantId, metrica, valor, data },
      update: { valor },
    });
  }

  private async valorMesAnterior(metrica: string): Promise<number | null> {
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    const anterior = await this.db().metricSnapshot.findFirst({
      where: { metrica, data: { lte: startOfUtcDay(umMesAtras) } },
      orderBy: { data: 'desc' },
    });
    return anterior ? Number(anterior.valor) : null;
  }
}
