import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { AuditService } from '../../audit/audit.service';
import {
  buildCiclosAquisitivos,
  computePeriodoResumo,
  dataLimiteConcessao,
  statusEfetivoFracao,
  TIPO_AFASTAMENTO_SUSPENSIVO,
  validarAbono,
  validarAvisoEInicio,
  validarFracionamento,
  valorExposicaoDobra,
  type AfastamentoParaCiclo,
  type PeriodoResumo,
  type StatusFracao,
} from './regras-ferias.util';
import { CreateFaltaDto, ProgramarFeriasDto, ReprovarFracaoDto } from './dto/ferias.dto';

function hojeUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfDayUtc(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class FeriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private async afastamentosSuspensivos(employeeId: string): Promise<AfastamentoParaCiclo[]> {
    return this.db().leaveRecord.findMany({
      where: { employeeId, tipo: TIPO_AFASTAMENTO_SUSPENSIVO },
      select: { id: true, tipo: true, inicio: true, retorno: true },
    });
  }

  /** Idempotente: cria os PeriodoAquisitivo que ainda não existem, do 1º até o ciclo em andamento.
   * Períodos suspensos por afastamento (art. 133, IV, CLT) já nascem com origemSuspensaoId marcado. */
  async garantirPeriodos(employeeId: string, dataAdmissao: Date, hoje: Date) {
    const { tenantId } = getRequestContext();
    const afastamentos = await this.afastamentosSuspensivos(employeeId);
    const ciclos = buildCiclosAquisitivos(dataAdmissao, hoje, afastamentos);
    const existentes = await this.db().periodoAquisitivo.findMany({ where: { employeeId }, select: { numero: true } });
    const numerosExistentes = new Set(existentes.map((e) => e.numero));
    const faltantes = ciclos.filter((c) => !numerosExistentes.has(c.numero));
    if (faltantes.length === 0) return;
    await this.db().periodoAquisitivo.createMany({
      data: faltantes.map((c) => ({
        tenantId,
        employeeId,
        numero: c.numero,
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        origemSuspensaoId: c.origemSuspensaoLeaveRecordId ?? null,
      })),
    });
  }

  private async faltasPorPeriodo(employeeId: string, dataInicio: Date, dataFim: Date): Promise<number> {
    return this.db().faltaInjustificada.count({ where: { employeeId, data: { gte: dataInicio, lt: dataFim } } });
  }

  async historicoColaborador(employeeId: string) {
    const employee = await this.db().employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    const hoje = hojeUtc();
    await this.garantirPeriodos(employeeId, employee.dataAdmissao, hoje);

    const [periodos, faltas] = await Promise.all([
      this.db().periodoAquisitivo.findMany({
        where: { employeeId },
        orderBy: { numero: 'asc' },
        include: { fracoes: { orderBy: { dataInicio: 'asc' }, include: { documentos: { where: { deletedAt: null } } } } },
      }),
      this.db().faltaInjustificada.findMany({ where: { employeeId }, orderBy: { data: 'desc' } }),
    ]);

    const periodosComResumo = periodos.map((p) => {
      const faltasNoPeriodo = faltas.filter((f) => f.data >= p.dataInicio && f.data < p.dataFim).length;
      const resumo = computePeriodoResumo(
        { numero: p.numero, dataInicio: p.dataInicio, dataFim: p.dataFim, suspensoPorAfastamento: p.origemSuspensaoId != null },
        faltasNoPeriodo,
        p.fracoes,
        hoje,
      );
      const fracoesComStatusEfetivo = p.fracoes.map((f) => ({ ...f, statusEfetivo: statusEfetivoFracao(f.status, f.dataInicio, f.dataFim, hoje) }));
      return { ...p, faltasNoPeriodo, resumo, fracoes: fracoesComStatusEfetivo };
    });

    return { employee, periodos: periodosComResumo, faltas };
  }

  /**
   * Roda garantirPeriodos pra todo colaborador ativo do tenant corrente — usado
   * antes de listagens amplas (Visão Geral, abas por status) pra nunca mostrar
   * dado desatualizado mesmo se o cron diário (FeriasCronService) ainda não rodou
   * hoje pra esse tenant específico.
   */
  private async garantirPeriodosDeTodos() {
    const hoje = hojeUtc();
    const employees = await this.db().employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, dataAdmissao: true } });
    await Promise.all(employees.map((e) => this.garantirPeriodos(e.id, e.dataAdmissao, hoje)));
    return { employees, hoje };
  }

  private async todosOsResumos(): Promise<
    { employee: { id: string; nome: string; filial: string | null; salario: unknown }; resumo: PeriodoResumo }[]
  > {
    const { employees, hoje } = await this.garantirPeriodosDeTodos();
    if (employees.length === 0) return [];

    const employeeIds = employees.map((e) => e.id);
    const [periodos, faltas, employeesCompletos] = await Promise.all([
      this.db().periodoAquisitivo.findMany({
        where: { employeeId: { in: employeeIds } },
        include: { fracoes: { select: { status: true, dias: true, diasAbono: true } } },
      }),
      this.db().faltaInjustificada.findMany({ where: { employeeId: { in: employeeIds } } }),
      this.db().employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, nome: true, filial: true, salario: true, dataAdmissao: true } }),
    ]);
    const employeeById = new Map(employeesCompletos.map((e) => [e.id, e]));

    return periodos.map((p) => {
      const faltasNoPeriodo = faltas.filter((f) => f.employeeId === p.employeeId && f.data >= p.dataInicio && f.data < p.dataFim).length;
      const resumo = computePeriodoResumo(
        { numero: p.numero, dataInicio: p.dataInicio, dataFim: p.dataFim, suspensoPorAfastamento: p.origemSuspensaoId != null },
        faltasNoPeriodo,
        p.fracoes,
        hoje,
      );
      const employee = employeeById.get(p.employeeId)!;
      return { employee, resumo };
    });
  }

  async visaoGeral() {
    const resumos = await this.todosOsResumos();
    const hoje = hojeUtc();

    const vencidas = resumos.filter((r) => r.resumo.status === 'VENCIDA');
    const aVencer = resumos.filter((r) => r.resumo.status === 'A_VENCER');
    const disponiveisOuParcial = resumos.filter((r) => r.resumo.status === 'DISPONIVEL' || r.resumo.status === 'PARCIALMENTE_GOZADA');

    const exposicaoTotal = vencidas.reduce((soma, r) => soma + valorExposicaoDobra(Number(r.employee.salario), r.resumo.saldoDisponivel), 0);

    const aVencerEm = (dias: number) => aVencer.filter((r) => (r.resumo.diasParaVencer ?? 999) <= dias).length;

    const [emFeriasHoje, pendentesAprovacao] = await Promise.all([
      this.db().fracaoDeFerias.findMany({
        where: { status: 'APROVADA', dataInicio: { lte: hoje }, dataFim: { gte: hoje } },
        include: { periodoAquisitivo: { include: { employee: { select: { nome: true, filial: true } } } } },
      }),
      this.db().fracaoDeFerias.count({ where: { status: 'PENDENTE' } }),
    ]);

    const saldos = resumos.map((r) => r.resumo.saldoDisponivel);
    const saldoMedio = saldos.length ? Math.round(saldos.reduce((a, b) => a + b, 0) / saldos.length) : 0;

    return {
      emFeriasHoje: emFeriasHoje.map((f) => ({
        id: f.id,
        nome: f.periodoAquisitivo.employee.nome,
        filial: f.periodoAquisitivo.employee.filial,
        retorno: f.dataFim,
      })),
      pendentesAprovacao,
      periodosVencidos: vencidas.length,
      exposicaoFinanceiraEstimada: Math.round(exposicaoTotal * 100) / 100,
      aVencer30Dias: aVencerEm(30),
      aVencer60Dias: aVencerEm(60),
      aVencer90Dias: aVencerEm(90),
      saldoMedio,
      distribuicao: {
        vencida: vencidas.length,
        aVencer: aVencer.length,
        dentroDoPrazo: disponiveisOuParcial.length,
      },
    };
  }

  async listarPeriodos(filtros: { status?: string; nome?: string; filial?: string; dataInicio?: string; dataFim?: string }) {
    const resumos = await this.todosOsResumos();
    let itens = resumos;

    if (filtros.status) itens = itens.filter((r) => r.resumo.status === filtros.status);
    if (filtros.nome) {
      const busca = filtros.nome.toLowerCase();
      itens = itens.filter((r) => r.employee.nome.toLowerCase().includes(busca));
    }
    if (filtros.filial) itens = itens.filter((r) => r.employee.filial === filtros.filial);
    if (filtros.dataInicio) {
      const de = startOfDayUtc(filtros.dataInicio);
      itens = itens.filter((r) => r.resumo.dataLimiteConcessao >= de);
    }
    if (filtros.dataFim) {
      const ate = startOfDayUtc(filtros.dataFim);
      itens = itens.filter((r) => r.resumo.dataLimiteConcessao <= ate);
    }

    return itens
      .map((r) => ({
        employeeId: r.employee.id,
        nome: r.employee.nome,
        filial: r.employee.filial,
        resumo: r.resumo,
        exposicaoEstimada: r.resumo.status === 'VENCIDA' ? valorExposicaoDobra(Number(r.employee.salario), r.resumo.saldoDisponivel) : null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async listarFracoes(status: 'PENDENTES' | 'APROVADAS' | 'EM_FERIAS', filtros: { nome?: string; filial?: string; dataInicio?: string; dataFim?: string }) {
    const hoje = hojeUtc();
    const where: Record<string, unknown> = {};
    if (status === 'PENDENTES') where.status = 'PENDENTE';
    else if (status === 'APROVADAS') where.status = 'APROVADA';
    else where.status = 'APROVADA'; // EM_FERIAS: filtra por data abaixo

    if (filtros.dataInicio) where.dataInicio = { gte: startOfDayUtc(filtros.dataInicio) };
    if (filtros.dataFim) where.dataFim = { ...(typeof where.dataFim === 'object' ? where.dataFim : {}), lte: startOfDayUtc(filtros.dataFim) };

    const fracoes = await this.db().fracaoDeFerias.findMany({
      where,
      include: { periodoAquisitivo: { include: { employee: { select: { id: true, nome: true, filial: true } } } } },
      orderBy: { dataInicio: 'asc' },
    });

    let filtradas = fracoes;
    if (status === 'EM_FERIAS') filtradas = filtradas.filter((f) => f.dataInicio <= hoje && f.dataFim >= hoje);
    else if (status === 'APROVADAS') filtradas = filtradas.filter((f) => !(f.dataInicio <= hoje && f.dataFim >= hoje));

    if (filtros.nome) {
      const busca = filtros.nome.toLowerCase();
      filtradas = filtradas.filter((f) => f.periodoAquisitivo.employee.nome.toLowerCase().includes(busca));
    }
    if (filtros.filial) filtradas = filtradas.filter((f) => f.periodoAquisitivo.employee.filial === filtros.filial);

    return filtradas.map((f) => ({
      id: f.id,
      employeeId: f.periodoAquisitivo.employee.id,
      nome: f.periodoAquisitivo.employee.nome,
      filial: f.periodoAquisitivo.employee.filial,
      dataInicio: f.dataInicio,
      dataFim: f.dataFim,
      dias: f.dias,
      status: statusEfetivoFracao(f.status as StatusFracao, f.dataInicio, f.dataFim, hoje),
    }));
  }

  private async mustFindPeriodo(id: string) {
    const periodo = await this.db().periodoAquisitivo.findUnique({
      where: { id },
      include: { employee: true, fracoes: true },
    });
    if (!periodo) throw new NotFoundException('Período aquisitivo não encontrado.');
    return periodo;
  }

  async programar(employeeId: string, dto: ProgramarFeriasDto) {
    const { userId } = getRequestContext();
    const periodo = await this.mustFindPeriodo(dto.periodoAquisitivoId);
    if (periodo.employeeId !== employeeId) throw new BadRequestException('Esse período aquisitivo não pertence a este colaborador.');
    if (periodo.origemSuspensaoId) {
      throw new BadRequestException('Este período aquisitivo perdeu o direito a férias devido a afastamento superior a 6 meses (art. 133, IV, CLT).');
    }

    const hoje = hojeUtc();
    const dataInicio = startOfDayUtc(dto.dataInicio);
    const dataFim = new Date(dataInicio.getTime() + (dto.dias - 1) * 86_400_000);
    const tipo = dto.tipo ?? 'NORMAL';

    if (tipo === 'NORMAL') {
      const fracoesNormaisAtivas = periodo.fracoes.filter((f) => f.tipo === 'NORMAL');
      const violacoesFracionamento = validarFracionamento(
        fracoesNormaisAtivas.map((f) => ({ status: f.status as StatusFracao, dias: f.dias })),
        dto.dias,
      );
      if (violacoesFracionamento.length > 0) throw new BadRequestException(violacoesFracionamento.join(' '));
    }

    if (dto.diasAbono) {
      const limiteConcessao = dataLimiteConcessao(periodo.dataFim);
      const violacoesAbono = validarAbono(dto.diasAbono, dataInicio, limiteConcessao, hoje);
      if (violacoesAbono.length > 0) throw new BadRequestException(violacoesAbono.join(' '));
    }

    const faltasNoPeriodo = await this.faltasPorPeriodo(employeeId, periodo.dataInicio, periodo.dataFim);
    const resumo = computePeriodoResumo(
      { numero: periodo.numero, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim, suspensoPorAfastamento: periodo.origemSuspensaoId != null },
      faltasNoPeriodo,
      periodo.fracoes,
      hoje,
    );
    if (dto.dias + (dto.diasAbono ?? 0) > resumo.saldoDisponivel) {
      throw new BadRequestException(`Saldo insuficiente — este período tem ${resumo.saldoDisponivel} dia(s) disponível(is).`);
    }

    // Aviso de 30 dias é recomendação operacional, não trava estrutural (mesmo
    // padrão do mockup: alerta exige justificativa preenchida, mas não bloqueia).
    const alertas = validarAvisoEInicio(dataInicio, hoje);
    if (alertas.length > 0 && !dto.justificativa?.trim()) {
      throw new BadRequestException(`Justificativa obrigatória para esta solicitação (fora da janela recomendada): ${alertas.join(' ')}`);
    }

    const { tenantId } = getRequestContext();
    const fracao = await this.db().fracaoDeFerias.create({
      data: {
        tenantId,
        periodoAquisitivoId: periodo.id,
        tipo,
        dataInicio,
        dataFim,
        dias: dto.dias,
        diasAbono: dto.diasAbono ?? 0,
        antecipa13: dto.antecipa13 ?? false,
        justificativa: dto.justificativa,
        solicitadoPorId: userId,
        avisoFormalizadoEm: new Date(),
      },
    });
    await this.audit.log('fracao_de_ferias', fracao.id, 'criada', { employeeId, dataInicio: dto.dataInicio, dias: dto.dias, diasAbono: dto.diasAbono });
    return fracao;
  }

  /** Preview de alertas pro modal "Programar férias" -- não cria nada, só antecipa o que a validação real vai acusar. */
  async previewAlertas(periodoAquisitivoId: string, dataInicioIso: string | undefined, dias: number | undefined, diasAbono: number | undefined) {
    const periodo = await this.mustFindPeriodo(periodoAquisitivoId);
    const hoje = hojeUtc();
    const alertas: string[] = [];

    if (periodo.employee.status !== 'ATIVO') alertas.push('Colaborador não está ativo.');

    const faltasNoPeriodo = await this.faltasPorPeriodo(periodo.employeeId, periodo.dataInicio, periodo.dataFim);
    const resumo = computePeriodoResumo(
      { numero: periodo.numero, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim, suspensoPorAfastamento: periodo.origemSuspensaoId != null },
      faltasNoPeriodo,
      periodo.fracoes,
      hoje,
    );
    if (resumo.status === 'PERDIDO_POR_AFASTAMENTO') {
      alertas.push('Este período aquisitivo perdeu o direito a férias devido a afastamento superior a 6 meses (art. 133, IV, CLT) — não é possível programar férias nele.');
    } else if (resumo.status === 'VENCIDA') {
      alertas.push('Este período está com saldo vencido — a concessão agora não elimina a obrigação de pagamento em dobro do trecho já vencido, apenas evita novo agravamento.');
    }

    if (dataInicioIso && dias) {
      const dataInicio = startOfDayUtc(dataInicioIso);
      alertas.push(...validarAvisoEInicio(dataInicio, hoje));
      if (dias + (diasAbono ?? 0) > resumo.saldoDisponivel) {
        alertas.push(`Saldo insuficiente — este período tem ${resumo.saldoDisponivel} dia(s) disponível(is).`);
      }
      const fracoesNormaisAtivas = periodo.fracoes.filter((f) => f.tipo === 'NORMAL');
      alertas.push(...validarFracionamento(fracoesNormaisAtivas.map((f) => ({ status: f.status as StatusFracao, dias: f.dias })), dias));
    }

    if (diasAbono) {
      alertas.push(...validarAbono(diasAbono, hoje, dataLimiteConcessao(periodo.dataFim), hoje));
    }

    return { alertas, saldoDisponivel: resumo.saldoDisponivel };
  }

  private async mustFindFracao(id: string) {
    const fracao = await this.db().fracaoDeFerias.findUnique({ where: { id }, include: { periodoAquisitivo: true } });
    if (!fracao) throw new NotFoundException('Solicitação de férias não encontrada.');
    return fracao;
  }

  async aprovar(id: string) {
    const { userId } = getRequestContext();
    const fracao = await this.mustFindFracao(id);
    if (fracao.status !== 'PENDENTE') throw new BadRequestException('Só é possível aprovar solicitações pendentes.');
    const atualizada = await this.db().fracaoDeFerias.update({
      where: { id },
      data: { status: 'APROVADA', aprovadoPorId: userId, dataAprovacao: new Date() },
    });
    await this.audit.log('fracao_de_ferias', id, 'aprovada', {});
    return atualizada;
  }

  async reprovar(id: string, dto: ReprovarFracaoDto) {
    const { userId } = getRequestContext();
    const fracao = await this.mustFindFracao(id);
    if (fracao.status !== 'PENDENTE') throw new BadRequestException('Só é possível reprovar solicitações pendentes.');
    const atualizada = await this.db().fracaoDeFerias.update({
      where: { id },
      data: { status: 'REPROVADA', aprovadoPorId: userId, dataAprovacao: new Date(), justificativa: dto.motivo ?? fracao.justificativa },
    });
    await this.audit.log('fracao_de_ferias', id, 'reprovada', { motivo: dto.motivo });
    return atualizada;
  }

  async cancelar(id: string) {
    const fracao = await this.mustFindFracao(id);
    if (fracao.status === 'CONCLUIDA') throw new BadRequestException('Não é possível cancelar uma fração já concluída.');
    const atualizada = await this.db().fracaoDeFerias.update({ where: { id }, data: { status: 'CANCELADA' } });
    await this.audit.log('fracao_de_ferias', id, 'cancelada', {});
    return atualizada;
  }

  async listarFaltas(employeeId: string) {
    return this.db().faltaInjustificada.findMany({ where: { employeeId }, orderBy: { data: 'desc' } });
  }

  async criarFalta(employeeId: string, dto: CreateFaltaDto) {
    const { tenantId, userName } = getRequestContext();
    const falta = await this.db().faltaInjustificada.create({
      data: { tenantId, employeeId, data: startOfDayUtc(dto.data), motivo: dto.motivo, registradoPor: userName },
    });
    await this.audit.log('falta_injustificada', falta.id, 'lancada', { employeeId, data: dto.data });
    return falta;
  }

  async removerFalta(employeeId: string, faltaId: string) {
    const falta = await this.db().faltaInjustificada.findUnique({ where: { id: faltaId } });
    if (!falta || falta.employeeId !== employeeId) throw new NotFoundException('Falta não encontrada.');
    await this.db().faltaInjustificada.delete({ where: { id: faltaId } });
    await this.audit.log('falta_injustificada', faltaId, 'removida', { employeeId });
    return { ok: true };
  }

  /** Saldo consolidado de um colaborador — reaproveitado pelos 8 consumidores que antes liam Employee.feriasSaldo. */
  async saldoAtual(employeeId: string): Promise<{ saldoDisponivel: number; proximoVencimento: Date | null; feriasVencendoEm60Dias: boolean }> {
    const employee = await this.db().employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    const hoje = hojeUtc();
    await this.garantirPeriodos(employeeId, employee.dataAdmissao, hoje);

    const periodos = await this.db().periodoAquisitivo.findMany({
      where: { employeeId },
      include: { fracoes: { select: { status: true, dias: true, diasAbono: true } } },
    });
    const faltas = await this.db().faltaInjustificada.findMany({ where: { employeeId } });

    let saldoDisponivel = 0;
    let proximoVencimento: Date | null = null;
    for (const p of periodos) {
      const faltasNoPeriodo = faltas.filter((f) => f.data >= p.dataInicio && f.data < p.dataFim).length;
      const resumo = computePeriodoResumo(
        { numero: p.numero, dataInicio: p.dataInicio, dataFim: p.dataFim, suspensoPorAfastamento: p.origemSuspensaoId != null },
        faltasNoPeriodo,
        p.fracoes,
        hoje,
      );
      if (resumo.status !== 'EM_AQUISICAO') saldoDisponivel += resumo.saldoDisponivel;
      if (
        resumo.status !== 'EM_AQUISICAO' &&
        resumo.status !== 'QUITADA' &&
        resumo.status !== 'PERDIDO_POR_AFASTAMENTO' &&
        (proximoVencimento === null || resumo.dataLimiteConcessao < proximoVencimento)
      ) {
        proximoVencimento = resumo.dataLimiteConcessao;
      }
    }
    if (!proximoVencimento) {
      const ultimoPeriodo = periodos[periodos.length - 1];
      proximoVencimento = ultimoPeriodo ? dataLimiteConcessao(ultimoPeriodo.dataFim) : dataLimiteConcessao(employee.dataAdmissao);
    }
    const diasAteVencimento = Math.round((proximoVencimento.getTime() - hoje.getTime()) / 86_400_000);
    return { saldoDisponivel, proximoVencimento, feriasVencendoEm60Dias: diasAteVencimento <= 60 };
  }
}
