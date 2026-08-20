import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { ComplianceOverviewService } from '../compliance/overview.service';
import { DocumentsService } from '../rh/documents/documents.service';
import { FeriasService } from '../rh/ferias/ferias.service';
import { LicenseService } from '../license/license.service';
import { buildTerminationAlerts } from '../rh/terminations/terminations-lembretes.util';
import { RiskEngineService, RiskItem } from '../risk/risk-engine.service';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
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
  /** Só presente quando o alerta corresponde a um item do motor de Risco (RiskEngineService) — auditabilidade do que gerou a severidade. */
  score?: number;
  impacto?: number;
  probabilidade?: number;
}

/** Nivel de risco (RiskEngineService) → prioridade de Alert, mapeamento 1:1. */
const NIVEL_PARA_PRIORIDADE: Record<string, Alert['prioridade']> = {
  Baixo: 'BAIXA',
  Médio: 'MEDIA',
  Alto: 'ALTA',
  Crítico: 'CRITICA',
};

function riskItemToAlert(item: RiskItem): Alert {
  return {
    hub: item.hub,
    mensagem: item.mensagem,
    alertKey: item.alertKey,
    prioridade: NIVEL_PARA_PRIORIDADE[item.nivel],
    href: item.href,
    score: item.score,
    impacto: item.impacto,
    probabilidade: item.probabilidade,
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceOverviewService,
    private readonly documents: DocumentsService,
    private readonly ferias: FeriasService,
    private readonly license: LicenseService,
    private readonly riskEngine: RiskEngineService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async kpis() {
    const db = this.db();

    const [
      colaboradoresAtivos,
      pontoPendente,
      feriasPendente,
      admissoesAbertas,
      desligamentosAbertos,
    ] = await Promise.all([
      db.employee.count({ where: { status: 'ATIVO' } }),
      db.timeJustification.count({ where: { status: 'PENDENTE' } }),
      db.vacationRequest.count({ where: { status: 'PENDENTE' } }),
      db.admission.count({ where: { status: { not: 'EFETIVADO' } } }),
      db.termination.count({ where: { status: 'EM_ANDAMENTO' } }),
    ]);
    const pendenciasAbertas =
      pontoPendente + feriasPendente + admissoesAbertas + desligamentosAbertos;

    const { conformidadeDocumental, totalItems: docTotalItems, totalCompliant: docTotalCompliant } = await this.refreshTasks();
    const complianceOverview = await this.compliance.get();
    const { modulos } = await this.license.publicLicense(getRequestContext().tenantId);
    const [sst, dp] = await Promise.all([
      modulos.includes('sst') ? this.sstSignals() : null,
      modulos.includes('dp') ? this.dpSignals() : null,
    ]);

    // Conformidade Geral: NÃO é média de percentuais por módulo (isso pesa
    // igual um módulo com 500 itens auditáveis e um com 5). É uma única razão
    // ponderada -- soma de itens conformes / soma de itens auditáveis -- só
    // com os módulos que a empresa realmente contratou. Cálculo
    // deliberadamente independente do Risco Geral (RiskEngineService,
    // abaixo): nenhum dos dois deriva do outro.
    const itensAuditaveis = [
      modulos.includes('rh') ? { total: docTotalItems, conformes: docTotalCompliant } : null,
      sst ? { total: sst.totalItens, conformes: sst.itensConformes } : null,
      dp ? { total: dp.totalItens, conformes: dp.itensConformes } : null,
      modulos.includes('compliance') ? { total: complianceOverview.itensAuditaveis, conformes: complianceOverview.itensConformes } : null,
    ].filter((v): v is { total: number; conformes: number } => v != null);
    const totalGeral = itensAuditaveis.reduce((a, b) => a + b.total, 0);
    const conformesGeral = itensAuditaveis.reduce((a, b) => a + b.conformes, 0);
    const conformidadeGeral = totalGeral > 0 ? Math.round((100 * conformesGeral) / totalGeral) : 100;

    // Risco Geral: motor único (RiskEngineService), nunca derivado da
    // Conformidade Geral acima -- ver regras de negócio no cabeçalho de
    // risk-engine.service.ts.
    const avaliacaoRisco = await this.riskEngine.evaluate();
    const riscoGeral = avaliacaoRisco.riscoGeral.nivel;
    const riscoGeralCategoria = avaliacaoRisco.riscoGeral.categoria;
    const riscoGeralHref = avaliacaoRisco.riscoGeral.item?.href ?? null;
    const alertasCriticosAtivos = avaliacaoRisco.items.filter((i) => i.nivel === 'Crítico').length;

    await Promise.all([
      this.captureSnapshot('COLABORADORES_ATIVOS', colaboradoresAtivos),
      this.captureSnapshot('PENDENCIAS_ABERTAS', pendenciasAbertas),
      this.captureSnapshot('CONFORMIDADE_GERAL', conformidadeGeral),
    ]);

    const [colaboradoresAnterior, pendenciasAnterior, conformidadeAnterior] =
      await Promise.all([
        this.valorMesAnterior('COLABORADORES_ATIVOS'),
        this.valorMesAnterior('PENDENCIAS_ABERTAS'),
        this.valorMesAnterior('CONFORMIDADE_GERAL'),
      ]);

    return {
      colaboradoresAtivos,
      colaboradoresAtivosDeltaPct:
        colaboradoresAnterior != null && colaboradoresAnterior > 0
          ? Math.round(
              ((colaboradoresAtivos - colaboradoresAnterior) /
                colaboradoresAnterior) *
                1000,
            ) / 10
          : null,
      pendenciasAbertas,
      pendenciasAbertasDelta:
        pendenciasAnterior != null
          ? pendenciasAbertas - pendenciasAnterior
          : null,
      conformidadeGeral,
      conformidadeGeralDelta:
        conformidadeAnterior != null
          ? conformidadeGeral - conformidadeAnterior
          : null,
      riscoGeral,
      riscoGeralCategoria,
      riscoGeralHref,
      alertasCriticosAtivos,
    };
  }

  async alerts(): Promise<Alert[]> {
    const { alerts } = await this.refreshTasks();
    return alerts;
  }

  private async refreshTasks(): Promise<{
    alerts: Alert[];
    conformidadeDocumental: number;
    totalItems: number;
    totalCompliant: number;
  }> {
    const result = await this.buildAlerts();
    await this.syncTasksFromAlerts(result.alerts);
    return result;
  }

  private async buildAlerts(): Promise<{
    alerts: Alert[];
    conformidadeDocumental: number;
    totalItems: number;
    totalCompliant: number;
  }> {
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
      colaboradoresCnhVencendo,
    ] = await Promise.all([
      db.admission.findMany({
        where: { esocialSent: false, status: { not: 'EFETIVADO' } },
        select: { id: true, nome: true },
      }),
      db.laborDeadline.count({
        where: { cumprido: false, vencimento: { lte: em30dias } },
      }),
      db.employee.findMany({
        where: { status: 'ATIVO' },
        select: { id: true, nome: true },
      }),
      db.collectiveAgreement.count({
        where: { reajusteAplicadoEm: null, vigenciaFim: { gte: hoje } },
      }),
      db.equipmentItem.findMany({
        select: {
          id: true,
          item: true,
          entregaEm: true,
          validadeMeses: true,
          employeeId: true,
          employee: { select: { nome: true } },
        },
      }),
      db.timeJustification.findMany({
        where: { status: 'PENDENTE' },
        select: {
          id: true,
          data: true,
          ocorrencia: true,
          employeeId: true,
          employee: { select: { nome: true } },
        },
      }),
      this.ferias.listarFracoes('PENDENTES', {}),
      db.nrTrainingRecord.findMany({
        select: {
          id: true,
          curso: true,
          dataRealizacao: true,
          validadeMeses: true,
          employeeId: true,
          employee: { select: { nome: true } },
        },
      }),
      db.employee.findMany({
        where: { status: 'ATIVO' },
        select: { id: true, nome: true },
      }),
      db.employee.findMany({
        where: { status: 'ATIVO', cnhValidade: { not: null, lte: em30dias } },
        select: { id: true, nome: true, cnhValidade: true },
      }),
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
    const saldosFerias = await this.ferias.saldosPorEmployee(colaboradoresFeriasVencendo.map((c) => c.id));
    for (const colaborador of colaboradoresFeriasVencendo) {
      const saldo = saldosFerias.get(colaborador.id);
      if (!saldo?.proximoVencimento || saldo.proximoVencimento > em60dias) continue;
      const diasRestantes = Math.round(
        (saldo.proximoVencimento.getTime() - hoje.getTime()) / 86_400_000,
      );
      alerts.push({
        hub: 'RH',
        alertKey: `rh-ferias-vencendo-${colaborador.id}`,
        prioridade: diasRestantes < 0 ? 'ALTA' : 'MEDIA',
        mensagem: `${colaborador.nome} — período aquisitivo de férias ${diasRestantes < 0 ? 'venceu' : 'vence'} ${formatDiasRestantes(saldo.proximoVencimento, hoje)}`,
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
      const diasRestantes = Math.round(
        (vencimento.getTime() - hoje.getTime()) / 86_400_000,
      );
      return diasRestantes <= 30;
    });
    for (const e of epiVencidoOuVencendo) {
      alerts.push({
        hub: 'DP',
        alertKey: `dp-epi-vencendo-${e.id}`,
        prioridade: 'BAIXA',
        mensagem: `${e.employee.nome} — ${e.item} vencido ou vencendo`,
        href: e.employeeId
          ? `/gestao-de-pessoas/colaboradores/${e.employeeId}`
          : '/dp/uniforme',
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
        mensagem: `${f.nome} — solicitação de férias aguardando aprovação`,
        href: `/gestao-de-pessoas/colaboradores/${f.employeeId}`,
      });
    }

    for (const t of treinamentos) {
      const vencimento = addMonths(t.dataRealizacao, t.validadeMeses);
      const diasRestantes = Math.round(
        (vencimento.getTime() - hoje.getTime()) / 86_400_000,
      );
      if (diasRestantes > 30) continue;
      alerts.push({
        hub: 'SST',
        alertKey: `sst-treinamento-vencendo-${t.id}`,
        prioridade: diasRestantes < 0 ? 'ALTA' : 'MEDIA',
        mensagem: `${t.employee.nome} — treinamento ${t.curso} ${diasRestantes < 0 ? 'vencido' : 'vencendo'} ${formatDiasRestantes(vencimento, hoje)}`,
        href: '/sst/treinamentos-nr',
      });
    }

    for (const c of colaboradoresCnhVencendo) {
      const vencimento = c.cnhValidade!;
      const diasRestantes = Math.round(
        (vencimento.getTime() - hoje.getTime()) / 86_400_000,
      );
      alerts.push({
        hub: 'DP',
        alertKey: `dp-cnh-vencendo-${c.id}`,
        prioridade: diasRestantes < 0 ? 'ALTA' : 'MEDIA',
        mensagem: `${c.nome} — CNH ${diasRestantes < 0 ? 'vencida' : 'vencendo'} ${formatDiasRestantes(vencimento, hoje)}`,
        href: `/gestao-de-pessoas/colaboradores/${c.id}`,
      });
    }

    alerts.push(...(await buildTerminationAlerts(this.prisma, hoje)));

    // Documentação obrigatória incompleta (CLT + requisitos configurados),
    // um alerta por colaborador que ainda não está 100% conforme. Computado
    // uma única vez aqui e reaproveitado pelo KPI de conformidade geral
    // (kpis() lê o retorno desta função em vez de chamar complianceOverview
    // de novo) — essa duplicação era o principal gargalo do painel.
    const {
      overall: conformidadeDocumental,
      byEmployee: conformidadePorEmployee,
      totalItems,
      totalCompliant,
    } = await this.documents.complianceOverview(
      empregadosAtivos.map((e) => e.id),
    );
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

    // Funde os itens do motor de Risco (RiskEngineService) na lista de
    // alertas: quando um item bate por alertKey com um alerta já gerado
    // acima (documentação zero conforme, férias vencida, ponto pendente,
    // EPI vencido, treinamento vencido — ver nota de acoplamento no topo de
    // risk-engine.service.ts), o motor de risco passa a ser a fonte
    // autoritativa de prioridade/score desse alerta. Os demais tipos do
    // motor (exames, PGR, políticas, ética) não tinham alerta individual
    // antes e entram como novos.
    const riskItems = await this.riskEngine.collectItems();
    const alertsByKey = new Map(alerts.map((a) => [a.alertKey, a] as const));
    for (const item of riskItems) {
      alertsByKey.set(item.alertKey, riskItemToAlert(item));
    }
    const alertsComRisco = [...alertsByKey.values()];

    return { alerts: alertsComRisco, conformidadeDocumental, totalItems, totalCompliant };
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
      const existing = await db.task.findUnique({
        where: { tenantId_alertKey: { tenantId, alertKey: alert.alertKey } },
      });
      const detalhes = { href: alert.href, score: alert.score, impacto: alert.impacto, probabilidade: alert.probabilidade };
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
      } else if (
        existing.titulo !== alert.mensagem ||
        existing.prioridade !== alert.prioridade ||
        existing.status === 'CONCLUIDA' ||
        JSON.stringify(existing.detalhes) !== JSON.stringify(detalhes)
      ) {
        await db.task.update({
          where: { id: existing.id },
          data: {
            titulo: alert.mensagem,
            prioridade: alert.prioridade,
            status: 'ABERTA',
            detalhes,
          },
        });
      }
    }

    await db.task.updateMany({
      where: {
        tenantId,
        origem: 'SISTEMA',
        status: 'ABERTA',
        alertKey: { notIn: currentKeys.length ? currentKeys : ['__none__'] },
      },
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

  async createTask(input: {
    titulo: string;
    modulo: string;
    prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    prazo?: string;
  }) {
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
   * Sinais de SST usados tanto pela conformidade geral (% de obrigações em
   * dia) quanto pelo risco geral (contagem de itens vencidos) — computados
   * juntos pra não repetir as mesmas consultas duas vezes por request.
   */
  private async sstSignals() {
    const db = this.db();
    const hoje = new Date();

    const [examesTotal, examesAtrasados, treinamentos, pgrTotal, pgrAtrasadas, riscosAltoMapa, acidentesAbertos] =
      await Promise.all([
        db.occupationalExam.count(),
        db.occupationalExam.count({ where: { dataRealizada: null, dataPrevista: { lt: hoje } } }),
        db.nrTrainingRecord.findMany({ select: { dataRealizacao: true, validadeMeses: true } }),
        db.pgrAction.count(),
        db.pgrAction.count({ where: { status: { not: 'CONCLUIDA' }, prazo: { lt: hoje } } }),
        db.riskMapEntry.count({ where: { nivel: 'ALTO' } }),
        db.accident.count({ where: { status: 'EM_ANALISE' } }),
      ]);

    const treinamentosVencidos = treinamentos.filter((t) => addMonths(t.dataRealizacao, t.validadeMeses) < hoje).length;
    const totalItens = examesTotal + treinamentos.length + pgrTotal;
    const pendentes = examesAtrasados + treinamentosVencidos + pgrAtrasadas;
    const conformidade = totalItens === 0 ? 100 : Math.round((1 - pendentes / totalItens) * 100);

    return {
      conformidade,
      totalItens,
      itensConformes: totalItens - pendentes,
      examesAtrasados,
      treinamentosVencidos,
      pgrAtrasadas,
      riscosAltoMapa,
      acidentesAbertos,
    };
  }

  /** Idem, para prazos trabalhistas de DP (LaborDeadline). */
  private async dpSignals() {
    const db = this.db();
    const hoje = new Date();

    const [total, vencidos] = await Promise.all([
      db.laborDeadline.count(),
      db.laborDeadline.count({ where: { cumprido: false, vencimento: { lt: hoje } } }),
    ]);
    const conformidade = total === 0 ? 100 : Math.round((1 - vencidos / total) * 100);

    return { conformidade, totalItens: total, itensConformes: total - vencidos, vencidos };
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
