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
    const { riscoGeral, alertasCriticosAtivos } = await this.calcRisco();

    await Promise.all([
      this.captureSnapshot('COLABORADORES_ATIVOS', colaboradoresAtivos),
      this.captureSnapshot('PENDENCIAS_ABERTAS', pendenciasAbertas),
      this.captureSnapshot('COMPLIANCE_GERAL', complianceOverview.maturidade),
      this.captureSnapshot('CONFORMIDADE_DOCUMENTAL', conformidadeDocumental),
    ]);

    const [colaboradoresAnterior, pendenciasAnterior, complianceAnterior, conformidadeAnterior] = await Promise.all([
      this.valorMesAnterior('COLABORADORES_ATIVOS'),
      this.valorMesAnterior('PENDENCIAS_ABERTAS'),
      this.valorMesAnterior('COMPLIANCE_GERAL'),
      this.valorMesAnterior('CONFORMIDADE_DOCUMENTAL'),
    ]);

    return {
      colaboradoresAtivos,
      colaboradoresAtivosDeltaPct:
        colaboradoresAnterior != null && colaboradoresAnterior > 0
          ? Math.round(((colaboradoresAtivos - colaboradoresAnterior) / colaboradoresAnterior) * 1000) / 10
          : null,
      pendenciasAbertas,
      pendenciasAbertasDelta: pendenciasAnterior != null ? pendenciasAbertas - pendenciasAnterior : null,
      complianceGeral: complianceOverview.maturidade,
      complianceGeralDelta: complianceAnterior != null ? complianceOverview.maturidade - complianceAnterior : null,
      conformidadeDocumental,
      conformidadeDocumentalDelta: conformidadeAnterior != null ? conformidadeDocumental - conformidadeAnterior : null,
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

    const [esocialPendentes, prazosPendentes, feriasVencendo, cctsSemReajuste, equipamentos] = await Promise.all([
      db.admission.count({ where: { esocialSent: false, status: { not: 'EFETIVADO' } } }),
      db.laborDeadline.count({ where: { cumprido: false, vencimento: { lte: em30dias } } }),
      db.employee.count({ where: { status: 'ATIVO', feriasVencimento: { lte: em60dias } } }),
      db.collectiveAgreement.count({ where: { reajusteAplicadoEm: null, vigenciaFim: { gte: hoje } } }),
      db.equipmentItem.findMany({ select: { entregaEm: true, validadeMeses: true } }),
    ]);

    if (esocialPendentes > 0) {
      alerts.push({
        hub: 'DP',
        alertKey: 'dp-esocial-s2200-pendente',
        prioridade: 'ALTA',
        mensagem: `Envio do evento eSocial S-2200 pendente para ${esocialPendentes} admissão(ões)`,
        href: '/gestao-de-pessoas/admissao',
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
    if (feriasVencendo > 0) {
      alerts.push({
        hub: 'RH',
        alertKey: 'rh-ferias-vencendo',
        prioridade: 'MEDIA',
        mensagem: `${feriasVencendo} colaborador(es) com período aquisitivo de férias vencendo em 60 dias`,
        href: '/gestao-de-pessoas/colaboradores',
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
    }).length;
    if (epiVencidoOuVencendo > 0) {
      alerts.push({
        hub: 'DP',
        alertKey: 'dp-epi-vencendo',
        prioridade: 'BAIXA',
        mensagem: `${epiVencidoOuVencendo} item(ns) de uniforme/EPI vencido(s) ou vencendo`,
        href: '/dp/uniforme',
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
