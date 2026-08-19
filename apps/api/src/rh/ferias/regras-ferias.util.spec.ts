import {
  buildCiclosAquisitivos,
  computePeriodoResumo,
  diasAdquiridosPorFaltas,
  TIPO_AFASTAMENTO_SUSPENSIVO,
  validarFracionamento,
  validarAbono,
  valorExposicaoDobra,
  type AfastamentoParaCiclo,
} from './regras-ferias.util';

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe('diasAdquiridosPorFaltas (art. 130 CLT)', () => {
  it('até 5 faltas garante 30 dias', () => {
    expect(diasAdquiridosPorFaltas(0)).toBe(30);
    expect(diasAdquiridosPorFaltas(5)).toBe(30);
  });
  it('6 a 14 faltas garante 24 dias', () => {
    expect(diasAdquiridosPorFaltas(6)).toBe(24);
    expect(diasAdquiridosPorFaltas(14)).toBe(24);
  });
  it('15 a 23 faltas garante 18 dias', () => {
    expect(diasAdquiridosPorFaltas(15)).toBe(18);
    expect(diasAdquiridosPorFaltas(23)).toBe(18);
  });
  it('24 a 32 faltas garante 12 dias', () => {
    expect(diasAdquiridosPorFaltas(24)).toBe(12);
    expect(diasAdquiridosPorFaltas(32)).toBe(12);
  });
  it('acima de 32 faltas perde o direito', () => {
    expect(diasAdquiridosPorFaltas(33)).toBe(0);
  });
});

describe('buildCiclosAquisitivos', () => {
  it('reconstrói todos os ciclos desde a admissão, incluindo o corrente', () => {
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2026-08-19'));
    expect(ciclos).toHaveLength(4);
    expect(ciclos[0]).toEqual({ numero: 1, dataInicio: d('2022-09-16'), dataFim: d('2023-09-16') });
    expect(ciclos[3].numero).toBe(4);
    expect(ciclos[3].dataInicio).toEqual(d('2025-09-16'));
  });

  it('colaborador admitido há menos de 12 meses só tem o ciclo em aquisição', () => {
    const ciclos = buildCiclosAquisitivos(d('2026-06-01'), d('2026-08-19'));
    expect(ciclos).toHaveLength(1);
  });
});

describe('buildCiclosAquisitivos com afastamento suspensivo (art. 133, IV, CLT)', () => {
  it('afastamento de 5 meses dentro do ciclo NÃO suspende (abaixo do limite de 6 meses)', () => {
    const afastamentos: AfastamentoParaCiclo[] = [
      { id: 'a1', tipo: TIPO_AFASTAMENTO_SUSPENSIVO, inicio: d('2023-01-01'), retorno: d('2023-06-01') },
    ];
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2023-09-16'), afastamentos);
    expect(ciclos[0].suspensoPorAfastamento).toBeUndefined();
  });

  it('afastamento contínuo acima de 6 meses suspende o ciclo e reinicia a contagem no retorno', () => {
    const afastamentos: AfastamentoParaCiclo[] = [
      { id: 'a1', tipo: TIPO_AFASTAMENTO_SUSPENSIVO, inicio: d('2023-01-01'), retorno: d('2023-08-01') },
    ];
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2024-09-16'), afastamentos);
    expect(ciclos[0].suspensoPorAfastamento).toBe(true);
    expect(ciclos[0].origemSuspensaoLeaveRecordId).toBe('a1');
    // o segundo ciclo reinicia no retorno (2023-08-01), não na data mecânica de aniversário (2023-09-16)
    expect(ciclos[1].dataInicio).toEqual(d('2023-08-01'));
    expect(ciclos[1].suspensoPorAfastamento).toBeUndefined();
  });

  it('múltiplos afastamentos descontínuos que somam mais de 6 meses também suspendem', () => {
    const afastamentos: AfastamentoParaCiclo[] = [
      { id: 'a1', tipo: TIPO_AFASTAMENTO_SUSPENSIVO, inicio: d('2022-10-01'), retorno: d('2023-02-01') },
      { id: 'a2', tipo: TIPO_AFASTAMENTO_SUSPENSIVO, inicio: d('2023-04-01'), retorno: d('2023-07-15') },
    ];
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2024-09-16'), afastamentos);
    expect(ciclos[0].suspensoPorAfastamento).toBe(true);
    expect(ciclos[0].origemSuspensaoLeaveRecordId).toBe('a2'); // gatilho = o de retorno mais recente
    expect(ciclos[1].dataInicio).toEqual(d('2023-07-15'));
  });

  it('afastamento ainda em curso (sem retorno) que já passou de 6 meses não gera o próximo ciclo', () => {
    const afastamentos: AfastamentoParaCiclo[] = [
      { id: 'a1', tipo: TIPO_AFASTAMENTO_SUSPENSIVO, inicio: d('2023-01-01'), retorno: null },
    ];
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2023-12-01'), afastamentos);
    expect(ciclos).toHaveLength(1);
    expect(ciclos[0].suspensoPorAfastamento).toBe(true);
  });

  it('licença maternidade não conta pra suspensão (tratamento legal distinto)', () => {
    const afastamentos: AfastamentoParaCiclo[] = [
      { id: 'a1', tipo: 'Licença maternidade', inicio: d('2023-01-01'), retorno: d('2023-09-01') },
    ];
    const ciclos = buildCiclosAquisitivos(d('2022-09-16'), d('2023-09-16'), afastamentos);
    expect(ciclos[0].suspensoPorAfastamento).toBeUndefined();
  });
});

describe('computePeriodoResumo com período suspenso por afastamento', () => {
  it('retorna status PERDIDO_POR_AFASTAMENTO com saldo zerado, ignorando faltas e frações', () => {
    const ciclo = { numero: 1, dataInicio: d('2022-09-16'), dataFim: d('2023-09-16'), suspensoPorAfastamento: true };
    const resumo = computePeriodoResumo(ciclo, 0, [], d('2023-10-01'));
    expect(resumo.status).toBe('PERDIDO_POR_AFASTAMENTO');
    expect(resumo.diasAdquiridos).toBe(0);
    expect(resumo.saldoDisponivel).toBe(0);
    expect(resumo.diasParaVencer).toBeNull();
  });
});

describe('computePeriodoResumo — prioridade de status', () => {
  const hoje = d('2026-08-19');

  it('período ainda dentro dos 12 meses de aquisição', () => {
    const ciclo = { numero: 1, dataInicio: d('2026-01-01'), dataFim: d('2027-01-01') };
    const resumo = computePeriodoResumo(ciclo, 0, [], hoje);
    expect(resumo.status).toBe('EM_AQUISICAO');
  });

  it('concessivo expirado com saldo residual vira Vencida, mesmo com fração gozada', () => {
    const ciclo = { numero: 1, dataInicio: d('2023-09-16'), dataFim: d('2024-09-16') };
    // concessivo expira em 2025-09-16 — já passou de 2026-08-19
    const resumo = computePeriodoResumo(ciclo, 0, [{ status: 'CONCLUIDA', dias: 10, diasAbono: 0 }], hoje);
    expect(resumo.status).toBe('VENCIDA');
    expect(resumo.saldoDisponivel).toBe(20);
    expect(resumo.diasParaVencer).toBeLessThan(0);
  });

  it('dentro da janela de alerta antes do fim do concessivo vira A vencer', () => {
    const ciclo = { numero: 1, dataInicio: d('2025-06-01'), dataFim: d('2026-06-01') };
    // concessivo expira em 2027-06-01 — a mais de 60 dias de 2026-08-19 normalmente,
    // então usamos janela maior pra forçar o caso.
    const resumo = computePeriodoResumo(ciclo, 0, [], hoje, 400);
    expect(resumo.status).toBe('A_VENCER');
  });

  it('saldo zerado é sempre Quitada, independente da data', () => {
    const ciclo = { numero: 1, dataInicio: d('2020-01-01'), dataFim: d('2021-01-01') };
    const resumo = computePeriodoResumo(ciclo, 0, [{ status: 'CONCLUIDA', dias: 30, diasAbono: 0 }], hoje);
    expect(resumo.status).toBe('QUITADA');
    expect(resumo.saldoDisponivel).toBe(0);
  });

  it('fração pendente não reduz o saldo disponível', () => {
    const ciclo = { numero: 1, dataInicio: d('2026-01-01'), dataFim: d('2027-01-01') };
    const resumo = computePeriodoResumo(ciclo, 0, [{ status: 'PENDENTE', dias: 15, diasAbono: 0 }], hoje);
    expect(resumo.saldoDisponivel).toBe(30);
    expect(resumo.diasGozados).toBe(0);
  });

  it('faltas injustificadas reduzem os dias adquiridos usados no saldo', () => {
    const ciclo = { numero: 1, dataInicio: d('2026-01-01'), dataFim: d('2027-01-01') };
    const resumo = computePeriodoResumo(ciclo, 20, [], hoje);
    expect(resumo.diasAdquiridos).toBe(18);
    expect(resumo.saldoDisponivel).toBe(18);
  });
});

describe('validarFracionamento', () => {
  it('permite a primeira fração se tiver ao menos 14 dias', () => {
    expect(validarFracionamento([], 14)).toEqual([]);
  });

  it('rejeita quando nenhuma fração chega a 14 dias', () => {
    const violacoes = validarFracionamento([{ status: 'APROVADA', dias: 10 }], 8);
    expect(violacoes.some((v) => v.includes('14 dias'))).toBe(true);
  });

  it('rejeita fração residual menor que o mínimo de 5 dias', () => {
    const violacoes = validarFracionamento([{ status: 'APROVADA', dias: 20 }], 3);
    expect(violacoes.some((v) => v.includes('5 dias'))).toBe(true);
  });

  it('rejeita a quarta fração', () => {
    const existentes: { status: 'APROVADA'; dias: number }[] = [
      { status: 'APROVADA', dias: 14 },
      { status: 'APROVADA', dias: 8 },
      { status: 'APROVADA', dias: 8 },
    ];
    const violacoes = validarFracionamento(existentes, 5);
    expect(violacoes.some((v) => v.includes('máximo'))).toBe(true);
  });

  it('frações reprovadas/canceladas não contam pro limite', () => {
    const existentes: { status: 'REPROVADA' | 'CANCELADA'; dias: number }[] = [
      { status: 'REPROVADA', dias: 14 },
      { status: 'CANCELADA', dias: 8 },
    ];
    expect(validarFracionamento(existentes, 14)).toEqual([]);
  });
});

describe('validarAbono', () => {
  it('aceita até 10 dias com antecedência suficiente', () => {
    expect(validarAbono(10, d('2026-10-01'), d('2027-01-01'), d('2026-08-19'))).toEqual([]);
  });
  it('rejeita mais de 10 dias', () => {
    const violacoes = validarAbono(11, d('2026-10-01'), d('2027-01-01'), d('2026-08-19'));
    expect(violacoes.some((v) => v.includes('10 dias'))).toBe(true);
  });
  it('rejeita quando falta menos de 15 dias pro fim do concessivo', () => {
    const violacoes = validarAbono(5, d('2026-08-25'), d('2026-08-30'), d('2026-08-19'));
    expect(violacoes.some((v) => v.includes('antecedência'))).toBe(true);
  });
});

describe('valorExposicaoDobra', () => {
  it('calcula salário/30 × dias × 2, mesma convenção de calculo-rescisao.ts', () => {
    expect(valorExposicaoDobra(3000, 30)).toBeCloseTo(6000, 2);
    expect(valorExposicaoDobra(3000, 15)).toBeCloseTo(3000, 2);
  });
});
