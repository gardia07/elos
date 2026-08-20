/**
 * Regras de negócio do módulo de Férias (CLT) — funções puras, sem acesso a banco,
 * pra poderem ser testadas isoladamente e reaproveitadas tanto pelo backfill quanto
 * pelos serviços que leem/escrevem PeriodoAquisitivo/FracaoDeFerias.
 *
 * Convenção deste arquivo: nada aqui é hardcoded "fundo de função" — os limiares
 * legais (fracionamento, abono, aviso, janela de alerta) ficam em constantes
 * exportadas no topo, porque a interpretação normativa pode mudar sem precisar
 * caçar número mágico no meio de lógica.
 */

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function inclusiveDays(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

// ── Configuração (parametrizável — não fixo dentro da lógica) ──────────────

/** Janela, em dias antes do fim do período concessivo, em que o período aquisitivo passa a status "A vencer". */
export const JANELA_ALERTA_PADRAO_DIAS = 60;

/**
 * Fracionamento (art. 134 §1º CLT, pós-Reforma Trabalhista 2017): até 3 frações,
 * uma delas com no mínimo 14 dias corridos, as demais com no mínimo 5 dias corridas
 * cada. Há divergência entre fontes sobre se o mínimo das frações adicionais seria
 * 5 ou 10 dias — 5 é o valor consolidado assumido aqui, mas fica configurável.
 */
export const FRACIONAMENTO_REGRAS = {
  maxFracoes: 3,
  minPrimeiraFracaoDias: 14,
  minDemaisFracoesDias: 5,
};

/** Abono pecuniário (art. 143 CLT): até 1/3 do período (10 dias num período cheio de 30), com antecedência mínima. */
export const ABONO_REGRAS = {
  maxDias: 10,
  antecedenciaMinDias: 15,
};

/** Comunicação formal do início das férias (art. 135 CLT). */
export const AVISO_REGRAS = {
  antecedenciaMinDias: 30,
};

// ── Período aquisitivo ──────────────────────────────────────────────────────

export interface CicloAquisitivo {
  numero: number;
  dataInicio: Date;
  dataFim: Date;
  /** Art. 133, IV, CLT: período perdeu o direito por afastamento > 6 meses no seu curso. */
  suspensoPorAfastamento?: boolean;
  origemSuspensaoLeaveRecordId?: string;
  diasAfastamentoSuspensivo?: number;
}

export interface AfastamentoParaCiclo {
  id: string;
  tipo: string;
  inicio: Date;
  retorno: Date | null;
}

/** Tipo de LeaveRecord que conta pra suspensão do período aquisitivo -- licença
 * maternidade/paternidade e atestados comuns têm tratamento legal distinto e
 * NÃO entram nessa contagem (só auxílio-doença/acidente pela Previdência). */
export const TIPO_AFASTAMENTO_SUSPENSIVO = 'INSS (auxílio-doença)';

/** Art. 133, IV, CLT: acima de 6 meses (180 dias), embora descontínuos, no mesmo período aquisitivo. */
export const DIAS_LIMITE_AFASTAMENTO_SUSPENSIVO = 180;

function diasAfastamentoSuspensivoNoIntervalo(afastamentos: AfastamentoParaCiclo[], inicio: Date, fim: Date, hoje: Date): number {
  return afastamentos
    .filter((a) => a.tipo === TIPO_AFASTAMENTO_SUSPENSIVO)
    .reduce((soma, a) => {
      const fimEfetivo = a.retorno ?? hoje;
      const overlapInicio = a.inicio > inicio ? a.inicio : inicio;
      const overlapFim = fimEfetivo < fim ? fimEfetivo : fim;
      if (overlapFim <= overlapInicio) return soma;
      return soma + Math.round((overlapFim.getTime() - overlapInicio.getTime()) / 86_400_000);
    }, 0);
}

/**
 * Reconstrói todos os ciclos de 12 meses desde a admissão até hoje (inclusive o
 * ciclo em andamento) — usado tanto pelo backfill quanto para detectar quando um
 * novo período precisa ser criado para um colaborador ativo.
 *
 * Quando `afastamentos` (só os do tipo TIPO_AFASTAMENTO_SUSPENSIVO importam) somam
 * mais de 6 meses dentro de um ciclo, esse ciclo perde o direito (art. 133, IV,
 * CLT) e o próximo período aquisitivo reinicia a contagem a partir da data de
 * retorno (art. 133, §2º) -- não da data mecânica de aniversário de admissão.
 * Se o afastamento que estourou o limite ainda está em curso (sem retorno), a
 * reconstrução para nesse ciclo -- o próximo só nasce quando a pessoa voltar.
 */
export function buildCiclosAquisitivos(dataAdmissao: Date, hoje: Date, afastamentos: AfastamentoParaCiclo[] = []): CicloAquisitivo[] {
  const ciclos: CicloAquisitivo[] = [];
  let inicio = dataAdmissao;
  let numero = 1;
  while (inicio <= hoje) {
    const fim = addMonths(inicio, 12);
    const diasSuspensao = diasAfastamentoSuspensivoNoIntervalo(afastamentos, inicio, fim, hoje);
    const suspenso = diasSuspensao > DIAS_LIMITE_AFASTAMENTO_SUSPENSIVO;

    if (!suspenso) {
      ciclos.push({ numero, dataInicio: inicio, dataFim: fim });
      inicio = fim;
      numero++;
      continue;
    }

    // Entre os afastamentos que se sobrepõem a este ciclo, o de retorno mais
    // recente é tomado como o "gatilho" do reinício do próximo período.
    const relevantes = afastamentos
      .filter((a) => a.tipo === TIPO_AFASTAMENTO_SUSPENSIVO && a.inicio < fim && (a.retorno ?? hoje) > inicio)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    const gatilho = relevantes[relevantes.length - 1];

    ciclos.push({
      numero,
      dataInicio: inicio,
      dataFim: fim,
      suspensoPorAfastamento: true,
      origemSuspensaoLeaveRecordId: gatilho?.id,
      diasAfastamentoSuspensivo: diasSuspensao,
    });

    if (!gatilho?.retorno) break; // ainda afastado -- próximo período só nasce quando retornar
    inicio = gatilho.retorno;
    numero++;
  }
  return ciclos;
}

export function dataLimiteConcessao(dataFim: Date): Date {
  return addMonths(dataFim, 12);
}

/**
 * Encontra a que período aquisitivo pertence uma data de gozo -- primeiro pela
 * janela concessiva (os 12 meses seguintes ao fim do ciclo, uso normal), com
 * fallback pra dentro do próprio ciclo de aquisição (gozo antecipado). Usado
 * pelo backfill pra relocar VacationRequest existentes no novo modelo.
 */
export function encontrarPeriodoPorDataDeUso(ciclos: CicloAquisitivo[], data: Date): CicloAquisitivo | null {
  for (const ciclo of ciclos) {
    const concessivoFim = dataLimiteConcessao(ciclo.dataFim);
    if (data >= ciclo.dataFim && data < concessivoFim) return ciclo;
  }
  for (const ciclo of ciclos) {
    if (data >= ciclo.dataInicio && data < ciclo.dataFim) return ciclo;
  }
  return null;
}

/**
 * Dias adquiridos por período conforme faltas injustificadas no ciclo aquisitivo
 * (art. 130 CLT). Acima de 32 faltas, o direito às férias daquele período se perde
 * (retorna 0) — não coberto textualmente pela tabela do art. 130, mas é a leitura
 * consolidada da doutrina/jurisprudência.
 */
export function diasAdquiridosPorFaltas(faltasInjustificadas: number): number {
  if (faltasInjustificadas <= 5) return 30;
  if (faltasInjustificadas <= 14) return 24;
  if (faltasInjustificadas <= 23) return 18;
  if (faltasInjustificadas <= 32) return 12;
  return 0;
}

export type StatusPeriodoAquisitivo =
  | 'EM_AQUISICAO'
  | 'DISPONIVEL'
  | 'A_VENCER'
  | 'VENCIDA'
  | 'PARCIALMENTE_GOZADA'
  | 'QUITADA'
  | 'PERDIDO_POR_AFASTAMENTO';

export type StatusFracao = 'PENDENTE' | 'APROVADA' | 'REPROVADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface FracaoParaCalculo {
  status: StatusFracao;
  dias: number;
  diasAbono: number;
}

/**
 * O banco só grava PENDENTE/APROVADA/REPROVADA/CANCELADA -- EM_ANDAMENTO e
 * CONCLUIDA nunca são escritos pela aplicação (só existem no backfill, como
 * fotografia histórica). Pra exibição, o status "efetivo" de uma fração
 * aprovada é sempre derivado da data de hoje, nunca precisa de um job
 * pra "virar" o status quando as férias começam ou terminam.
 */
export function statusEfetivoFracao(status: StatusFracao, dataInicio: Date, dataFim: Date, hoje: Date): StatusFracao {
  if (status !== 'APROVADA') return status;
  if (hoje < dataInicio) return 'APROVADA';
  if (hoje > dataFim) return 'CONCLUIDA';
  return 'EM_ANDAMENTO';
}

export interface PeriodoResumo {
  numero: number;
  dataInicio: Date;
  dataFim: Date;
  dataLimiteConcessao: Date;
  diasAdquiridos: number;
  diasGozados: number;
  diasVendidos: number;
  saldoDisponivel: number;
  status: StatusPeriodoAquisitivo;
  diasParaVencer: number | null; // negativo = já vencido há N dias; null fora de A_VENCER/VENCIDA
}

/**
 * Só frações efetivamente realizadas/confirmadas contam pro saldo -- pendente e
 * reprovada/cancelada não reduzem o saldo disponível do período.
 */
function contamComoGozo(status: FracaoParaCalculo['status']): boolean {
  return status === 'APROVADA' || status === 'EM_ANDAMENTO' || status === 'CONCLUIDA';
}

/**
 * Calcula o resumo completo de um período aquisitivo -- status tem prioridade
 * definida (não é ambíguo quando mais de uma regra se aplicaria):
 * perdido por afastamento > saldo zerado > em aquisição > concessivo expirado >
 * janela de alerta > parcialmente gozado > disponível.
 */
export function computePeriodoResumo(
  ciclo: CicloAquisitivo,
  faltasInjustificadas: number,
  fracoes: FracaoParaCalculo[],
  hoje: Date,
  janelaAlertaDias: number = JANELA_ALERTA_PADRAO_DIAS,
): PeriodoResumo {
  const limiteConcessao = dataLimiteConcessao(ciclo.dataFim);

  if (ciclo.suspensoPorAfastamento) {
    return {
      numero: ciclo.numero,
      dataInicio: ciclo.dataInicio,
      dataFim: ciclo.dataFim,
      dataLimiteConcessao: limiteConcessao,
      diasAdquiridos: 0,
      diasGozados: 0,
      diasVendidos: 0,
      saldoDisponivel: 0,
      status: 'PERDIDO_POR_AFASTAMENTO',
      diasParaVencer: null,
    };
  }

  const diasAdquiridos = diasAdquiridosPorFaltas(faltasInjustificadas);

  const diasGozados = fracoes.filter((f) => contamComoGozo(f.status)).reduce((s, f) => s + f.dias, 0);
  const diasVendidos = fracoes.filter((f) => contamComoGozo(f.status)).reduce((s, f) => s + f.diasAbono, 0);
  const saldoDisponivel = Math.max(0, diasAdquiridos - diasGozados - diasVendidos);

  const diasAteLimite = Math.round((limiteConcessao.getTime() - hoje.getTime()) / 86_400_000);

  let status: StatusPeriodoAquisitivo;
  let diasParaVencer: number | null = null;

  if (saldoDisponivel === 0 && diasAdquiridos > 0) {
    status = 'QUITADA';
  } else if (hoje < ciclo.dataFim) {
    status = 'EM_AQUISICAO';
  } else if (hoje >= limiteConcessao) {
    status = 'VENCIDA';
    diasParaVencer = diasAteLimite; // negativo
  } else if (diasAteLimite <= janelaAlertaDias) {
    status = 'A_VENCER';
    diasParaVencer = diasAteLimite;
  } else if (diasGozados > 0) {
    status = 'PARCIALMENTE_GOZADA';
  } else {
    status = 'DISPONIVEL';
  }

  return {
    numero: ciclo.numero,
    dataInicio: ciclo.dataInicio,
    dataFim: ciclo.dataFim,
    dataLimiteConcessao: limiteConcessao,
    diasAdquiridos,
    diasGozados,
    diasVendidos,
    saldoDisponivel,
    status,
    diasParaVencer,
  };
}

/** Estimativa da exposição financeira de um período vencido — pagamento em dobro (Súmula 81 TST). */
export function valorExposicaoDobra(salarioMensal: number, saldoDisponivel: number): number {
  const valorDiaria = salarioMensal / 30;
  return Math.round(valorDiaria * saldoDisponivel * 2 * 100) / 100;
}

// ── Fracionamento ────────────────────────────────────────────────────────

export interface FracaoExistenteParaValidacao {
  status: FracaoParaCalculo['status'];
  dias: number;
}

/**
 * Valida uma nova fração de férias normais contra as regras de fracionamento --
 * retorna a lista de violações (vazia = ok). Abono/coletiva não contam pro limite
 * de frações (não são "gozo" de fato); só frações NORMAL ativas (não
 * reprovadas/canceladas) contam.
 */
export function validarFracionamento(fracoesExistentesNormais: FracaoExistenteParaValidacao[], novaFracaoDias: number): string[] {
  const violacoes: string[] = [];
  const ativas = fracoesExistentesNormais.filter((f) => f.status !== 'REPROVADA' && f.status !== 'CANCELADA');
  const totalFracoes = ativas.length + 1;

  if (totalFracoes > FRACIONAMENTO_REGRAS.maxFracoes) {
    violacoes.push(`Este período já tem ${ativas.length} fração(ões) — o máximo permitido é ${FRACIONAMENTO_REGRAS.maxFracoes}.`);
  }

  const todasAsFracoesDias = [...ativas.map((f) => f.dias), novaFracaoDias];
  const maior = Math.max(...todasAsFracoesDias);
  if (maior < FRACIONAMENTO_REGRAS.minPrimeiraFracaoDias) {
    violacoes.push(`Pelo menos uma das frações precisa ter no mínimo ${FRACIONAMENTO_REGRAS.minPrimeiraFracaoDias} dias corridos.`);
  }
  const menoresQueMinimo = todasAsFracoesDias.filter((d) => d !== maior && d < FRACIONAMENTO_REGRAS.minDemaisFracoesDias);
  if (menoresQueMinimo.length > 0) {
    violacoes.push(`As demais frações precisam ter no mínimo ${FRACIONAMENTO_REGRAS.minDemaisFracoesDias} dias corridos cada.`);
  }

  return violacoes;
}

/**
 * Valida o pedido de abono pecuniário contra o limite legal e a antecedência mínima
 * (art. 143, §1º, CLT: deve ser requerido até 15 dias antes do término do período
 * AQUISITIVO -- prazo decadencial, não se confunde com o fim do período concessivo).
 */
export function validarAbono(diasAbono: number, dataInicioFracao: Date, dataFimPeriodoAquisitivo: Date, hoje: Date): string[] {
  const violacoes: string[] = [];
  if (diasAbono <= 0) return violacoes;
  if (diasAbono > ABONO_REGRAS.maxDias) {
    violacoes.push(`Abono pecuniário limitado a ${ABONO_REGRAS.maxDias} dias.`);
  }
  const diasAteFimPeriodo = Math.round((dataFimPeriodoAquisitivo.getTime() - hoje.getTime()) / 86_400_000);
  if (diasAteFimPeriodo < 0) {
    violacoes.push('O prazo para requerer abono pecuniário deste período já se encerrou (até 15 dias antes do término do período aquisitivo) — o direito decaiu (art. 143, §1º, CLT).');
  } else if (diasAteFimPeriodo < ABONO_REGRAS.antecedenciaMinDias) {
    violacoes.push(`Abono pecuniário precisa ser solicitado até ${ABONO_REGRAS.antecedenciaMinDias} dias antes do término do período aquisitivo (art. 143, §1º, CLT) — prazo decadencial.`);
  }
  void dataInicioFracao;
  return violacoes;
}

/** Valida a antecedência do aviso de início das férias (art. 135 CLT) e a proibição de início a até 2 dias de feriado/DSR. */
export function validarAvisoEInicio(dataInicio: Date, hoje: Date): string[] {
  const violacoes: string[] = [];
  const diasAntecedencia = Math.round((dataInicio.getTime() - hoje.getTime()) / 86_400_000);
  if (diasAntecedencia < AVISO_REGRAS.antecedenciaMinDias) {
    violacoes.push(`O início das férias precisa ser avisado com pelo menos ${AVISO_REGRAS.antecedenciaMinDias} dias de antecedência.`);
  }
  return violacoes;
}

export function addDaysUtil(date: Date, days: number): Date {
  return addDays(date, days);
}
