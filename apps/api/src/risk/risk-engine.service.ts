import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../rh/documents/documents.service';
import { FeriasService } from '../rh/ferias/ferias.service';

export type RiskCategoria = 'DP' | 'SST' | 'Compliance' | 'Psicologia';
export type RiskNivel = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';

export interface RiskItem {
  categoria: RiskCategoria;
  tipo: string;
  label: string;
  impacto: number;
  probabilidade: number;
  score: number;
  nivel: RiskNivel;
  hub: string;
  mensagem: string;
  href: string;
  alertKey: string;
}

export interface RiskCategoriaResultado {
  categoria: RiskCategoria;
  nivel: RiskNivel;
  scoreMaximo: number;
  itemCount: number;
  itemsAltoOuCritico: number;
  escalado: boolean;
  itemDriver: RiskItem | null;
}

export interface RiskEvaluation {
  riscoGeral: {
    nivel: RiskNivel;
    categoria: RiskCategoria | null;
    item: RiskItem | null;
  };
  categorias: RiskCategoriaResultado[];
  items: RiskItem[];
}

const NIVEL_ORDEM: RiskNivel[] = ['Baixo', 'Médio', 'Alto', 'Crítico'];

/** Faixas de classificação do score (impacto × probabilidade, 1 a 25). */
export function classifyScore(score: number): RiskNivel {
  if (score >= 18) return 'Crítico';
  if (score >= 11) return 'Alto';
  if (score >= 5) return 'Médio';
  return 'Baixo';
}

export function escalonarUmNivel(nivel: RiskNivel): RiskNivel {
  const i = NIVEL_ORDEM.indexOf(nivel);
  return NIVEL_ORDEM[Math.min(i + 1, NIVEL_ORDEM.length - 1)];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Denúncia/caso de ética em aberto por mais que isso é tratado como "prolongado". */
const DIAS_CASO_PROLONGADO = 60;

/**
 * Motor único de cálculo de Risco Geral do ELOS.
 *
 * Regras de negócio (não alterar sem atualizar junto o texto que as descreve
 * na conversa/commit que introduziu este arquivo):
 * 1. score_item = impacto (1-5, tabela `risk_impact_rules`) × probabilidade
 *    (sempre 5 para não conformidades já existentes/consumadas — reservado
 *    para preditivos no futuro).
 * 2. risco_categoria = MAX(score_item) da categoria; se 3+ itens da mesma
 *    categoria estiverem em Alto ou Crítico ao mesmo tempo, sobe um nível
 *    (risco sistêmico, não só o pior caso isolado).
 * 3. risco_geral = MAX(risco_categoria) entre todas as categorias -- NUNCA
 *    média. Uma categoria em Crítico torna o geral Crítico.
 * 4. Conformidade Geral (%) é calculada em outro lugar (DashboardService),
 *    de forma totalmente independente -- este serviço nunca a lê nem a
 *    alimenta.
 *
 * Nota de acoplamento: para 5 dos tipos (documentação zero conforme, férias
 * vencida, ponto pendente, EPI vencido, treinamento vencido) o `alertKey`
 * abaixo é escrito para bater exatamente com o alertKey que
 * DashboardService.buildAlerts() já gera pra esses mesmos casos -- assim o
 * alerta existente ganha o score em vez de duplicar. Os outros tipos (exames,
 * PGR, políticas, ética) não tinham alerta individual antes e são novos.
 */
@Injectable()
export class RiskEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly ferias: FeriasService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private async getWeights(): Promise<Map<string, { impacto: number; categoria: RiskCategoria; label: string }>> {
    const rules = await this.db().riskImpactRule.findMany({ where: { ativo: true } });
    return new Map(rules.map((r) => [r.tipo, { impacto: r.impacto, categoria: r.categoria as RiskCategoria, label: r.label }]));
  }

  private buildItem(
    weights: Map<string, { impacto: number; categoria: RiskCategoria; label: string }>,
    tipo: string,
    opts: { probabilidade?: number; hub: string; mensagem: string; href: string; alertKey: string },
  ): RiskItem | null {
    const w = weights.get(tipo);
    if (!w) return null; // tipo desativado pelo tenant -- não entra na conta
    const probabilidade = opts.probabilidade ?? 5;
    const score = w.impacto * probabilidade;
    return {
      categoria: w.categoria,
      tipo,
      label: w.label,
      impacto: w.impacto,
      probabilidade,
      score,
      nivel: classifyScore(score),
      hub: opts.hub,
      mensagem: opts.mensagem,
      href: opts.href,
      alertKey: opts.alertKey,
    };
  }

  /** Cada não conformidade real hoje no sistema, uma linha por item. */
  async collectItems(): Promise<RiskItem[]> {
    const weights = await this.getWeights();
    const db = this.db();
    const hoje = new Date();
    const items: RiskItem[] = [];
    const push = (item: RiskItem | null) => {
      if (item) items.push(item);
    };

    const empregadosAtivos = await db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, nome: true } });

    // DP — documentação/cadastro 0% conforme
    const { byEmployee: conformidadePorEmployee } = await this.documents.complianceOverview(
      empregadosAtivos.map((e) => e.id),
    );
    for (const emp of empregadosAtivos) {
      if ((conformidadePorEmployee[emp.id] ?? 100) > 0) continue;
      push(
        this.buildItem(weights, 'documentacao_cadastro_zero_conforme', {
          hub: 'RH',
          mensagem: `${emp.nome} — documentação/cadastro 0% conforme`,
          href: `/gestao-de-pessoas/colaboradores/${emp.id}?tab=documentos`,
          // Mesma chave usada pelo alerta "documentação incompleta" em
          // DashboardService.buildAlerts() -- quando a conformidade cai a
          // 0%, os dois convergem no mesmo Task e o alerta ganha o score.
          alertKey: `rh-documentacao-incompleta-${emp.id}`,
        }),
      );
    }

    // DP — férias vencidas (escalonado pela quantidade de dias vencidos)
    const periodosVencidos = await this.ferias.listarPeriodos({ status: 'VENCIDA' });
    for (const p of periodosVencidos) {
      const diasVencido = Math.abs(p.resumo.diasParaVencer ?? 0);
      const tipo =
        diasVencido <= 60
          ? 'ferias_vencidas_ate_60_dias'
          : diasVencido <= 180
            ? 'ferias_vencidas_61_a_180_dias'
            : 'ferias_vencidas_acima_180_dias';
      push(
        this.buildItem(weights, tipo, {
          hub: 'RH',
          mensagem: `${p.nome} — período aquisitivo de férias vencido há ${diasVencido} dia(s)`,
          href: `/gestao-de-pessoas/colaboradores/${p.employeeId}`,
          // Mesma chave do alerta "férias vencendo/vencida" por colaborador
          // em buildAlerts() -- ver comentário lá sobre esse acoplamento.
          alertKey: `rh-ferias-vencendo-${p.employeeId}`,
        }),
      );
    }

    // DP — ponto eletrônico pendente
    const pontosPendentes = await db.timeJustification.findMany({
      where: { status: 'PENDENTE' },
      select: { id: true, employee: { select: { nome: true } } },
    });
    for (const p of pontosPendentes) {
      push(
        this.buildItem(weights, 'ponto_eletronico_pendente', {
          hub: 'DP',
          mensagem: `${p.employee.nome} — ocorrência de ponto pendente de justificativa`,
          href: '/dp/ponto',
          alertKey: `dp-ponto-pendente-${p.id}`,
        }),
      );
    }

    // DP — exame admissional/demissional pendente
    const examesAdmDem = await db.occupationalExam.findMany({
      where: { tipo: { in: ['ADMISSIONAL', 'DEMISSIONAL'] }, dataRealizada: null, dataPrevista: { lt: hoje } },
      select: { id: true, employeeId: true, tipo: true, employee: { select: { nome: true } } },
    });
    for (const e of examesAdmDem) {
      push(
        this.buildItem(weights, 'exame_admissional_demissional_pendente', {
          hub: 'SST',
          mensagem: `${e.employee.nome} — exame ${e.tipo === 'ADMISSIONAL' ? 'admissional' : 'demissional'} pendente`,
          href: `/gestao-de-pessoas/colaboradores/${e.employeeId}`,
          alertKey: `risco-sst-exame-admdem-${e.id}`,
        }),
      );
    }

    // SST — exame periódico vencido
    const examesPeriodicos = await db.occupationalExam.findMany({
      where: { tipo: 'PERIODICO', dataRealizada: null, dataPrevista: { lt: hoje } },
      select: { id: true, employeeId: true, employee: { select: { nome: true } } },
    });
    for (const e of examesPeriodicos) {
      push(
        this.buildItem(weights, 'exame_periodico_vencido', {
          hub: 'SST',
          mensagem: `${e.employee.nome} — exame periódico vencido`,
          href: `/gestao-de-pessoas/colaboradores/${e.employeeId}`,
          alertKey: `risco-sst-exame-periodico-${e.id}`,
        }),
      );
    }

    // SST — EPI não registrado/vencido
    const equipamentos = await db.equipmentItem.findMany({
      select: { id: true, item: true, entregaEm: true, validadeMeses: true, employeeId: true, employee: { select: { nome: true } } },
    });
    for (const e of equipamentos) {
      if (addMonths(e.entregaEm, e.validadeMeses) >= hoje) continue;
      push(
        this.buildItem(weights, 'epi_nao_registrado', {
          hub: 'DP',
          mensagem: `${e.employee.nome} — ${e.item} vencido`,
          href: `/gestao-de-pessoas/colaboradores/${e.employeeId}`,
          alertKey: `dp-epi-vencendo-${e.id}`,
        }),
      );
    }

    // SST — treinamento de NR vencido
    const treinamentos = await db.nrTrainingRecord.findMany({
      select: { id: true, curso: true, dataRealizacao: true, validadeMeses: true, employeeId: true, employee: { select: { nome: true } } },
    });
    for (const t of treinamentos) {
      if (addMonths(t.dataRealizacao, t.validadeMeses) >= hoje) continue;
      push(
        this.buildItem(weights, 'treinamento_nr_vencido', {
          hub: 'SST',
          mensagem: `${t.employee.nome} — treinamento ${t.curso} vencido`,
          href: '/sst/treinamentos-nr',
          alertKey: `sst-treinamento-vencendo-${t.id}`,
        }),
      );
    }

    // SST — PGR/PCMSO desatualizado (ações do plano atrasadas)
    const pgrAtrasadas = await db.pgrAction.findMany({
      where: { status: { not: 'CONCLUIDA' }, prazo: { lt: hoje } },
      select: { id: true, acao: true, setor: true },
    });
    for (const a of pgrAtrasadas) {
      push(
        this.buildItem(weights, 'pgr_pcmso_desatualizado', {
          hub: 'SST',
          mensagem: `Ação de PGR/PCMSO atrasada — ${a.acao} (${a.setor})`,
          href: '/sst/pgr-pcmso',
          alertKey: `risco-sst-pgr-atrasada-${a.id}`,
        }),
      );
    }

    // Compliance — política interna não assinada (um item por política com pendência)
    if (empregadosAtivos.length > 0) {
      const politicasAtivas = await db.compliancePolicy.findMany({ where: { ativo: true }, select: { id: true, titulo: true } });
      for (const pol of politicasAtivas) {
        const aceites = await db.policyAcknowledgment.count({ where: { policyId: pol.id } });
        const pendentes = empregadosAtivos.length - aceites;
        if (pendentes <= 0) continue;
        push(
          this.buildItem(weights, 'politica_interna_nao_assinada', {
            hub: 'Compliance',
            mensagem: `Política "${pol.titulo}" — ${pendentes} colaborador(es) sem assinatura`,
            href: '/compliance/politicas',
            alertKey: `risco-compliance-politica-${pol.id}`,
          }),
        );
      }
    }

    // Compliance — conflito de interesse não declarado / denúncia com caso prolongado
    const casosAbertos = await db.ethicsCase.findMany({
      where: { status: { in: ['ABERTO', 'EM_INVESTIGACAO'] } },
      select: { id: true, protocolo: true, categoria: true, createdAt: true },
    });
    for (const c of casosAbertos) {
      if (c.categoria === 'CONFLITO_INTERESSE') {
        push(
          this.buildItem(weights, 'conflito_interesse_nao_declarado', {
            hub: 'Compliance',
            mensagem: `Caso ${c.protocolo} — conflito de interesse não declarado`,
            href: '/compliance/canal-etica',
            alertKey: `risco-compliance-conflito-${c.id}`,
          }),
        );
      }
      const diasAberto = Math.round((hoje.getTime() - c.createdAt.getTime()) / 86_400_000);
      if (diasAberto >= DIAS_CASO_PROLONGADO) {
        push(
          this.buildItem(weights, 'denuncia_caso_aberto_prolongado', {
            hub: 'Compliance',
            mensagem: `Caso ${c.protocolo} — em aberto há ${diasAberto} dia(s)`,
            href: '/compliance/canal-etica',
            alertKey: `risco-compliance-prolongado-${c.id}`,
          }),
        );
      }
    }

    // Psicologia — o módulo ainda não tem tela/tabela própria no sistema (só
    // o rótulo existe hoje), então não há fonte de dados real para
    // 'avaliacao_psicossocial_pendente' nem 'afastamento_saude_mental_sem_acompanhamento'.
    // Os pesos já estão cadastrados (risk-weights.ts); assim que o módulo for
    // implementado, basta adicionar aqui os mesmos dois blocos push(...).

    return items;
  }

  async evaluate(): Promise<RiskEvaluation> {
    const [items, weights] = await Promise.all([this.collectItems(), this.getWeights()]);
    const categoriasConhecidas = [...new Set([...weights.values()].map((w) => w.categoria))];
    return aggregateRisk(items, categoriasConhecidas);
  }
}

/**
 * Regras 2 e 3 isoladas em função pura (sem I/O), pra poder testar a
 * agregação/escalonamento/MAX-nunca-média sem precisar de banco.
 */
export function aggregateRisk(items: RiskItem[], categoriasConhecidas: RiskCategoria[]): RiskEvaluation {
  const categorias: RiskCategoriaResultado[] = [];
  for (const categoria of categoriasConhecidas) {
    const itensCategoria = items.filter((i) => i.categoria === categoria);
    const scoreMaximo = itensCategoria.length ? Math.max(...itensCategoria.map((i) => i.score)) : 0;
    const itemDriver = itensCategoria.find((i) => i.score === scoreMaximo) ?? null;
    let nivel = classifyScore(scoreMaximo);
    const itemsAltoOuCritico = itensCategoria.filter((i) => i.nivel === 'Alto' || i.nivel === 'Crítico').length;
    const escalado = itemsAltoOuCritico >= 3;
    if (escalado) nivel = escalonarUmNivel(nivel);
    categorias.push({ categoria, nivel, scoreMaximo, itemCount: itensCategoria.length, itemsAltoOuCritico, escalado, itemDriver });
  }

  let riscoGeralNivel: RiskNivel = 'Baixo';
  let categoriaOrigem: RiskCategoriaResultado | null = null;
  for (const c of categorias) {
    if (NIVEL_ORDEM.indexOf(c.nivel) > NIVEL_ORDEM.indexOf(riscoGeralNivel)) {
      riscoGeralNivel = c.nivel;
      categoriaOrigem = c;
    }
  }

  return {
    riscoGeral: {
      nivel: riscoGeralNivel,
      categoria: categoriaOrigem?.categoria ?? null,
      item: categoriaOrigem?.itemDriver ?? null,
    },
    categorias: categorias.sort((a, b) => NIVEL_ORDEM.indexOf(b.nivel) - NIVEL_ORDEM.indexOf(a.nivel)),
    items,
  };
}
