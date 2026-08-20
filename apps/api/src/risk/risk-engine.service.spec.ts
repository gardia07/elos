import { aggregateRisk, classifyScore, escalonarUmNivel, RiskItem } from './risk-engine.service';

function item(overrides: Partial<RiskItem> & Pick<RiskItem, 'categoria' | 'impacto'>): RiskItem {
  const probabilidade = overrides.probabilidade ?? 5;
  const score = overrides.impacto * probabilidade;
  return {
    tipo: 'teste',
    label: 'Item de teste',
    hub: overrides.categoria,
    mensagem: 'mensagem de teste',
    href: '/teste',
    alertKey: `teste-${Math.random()}`,
    probabilidade,
    score,
    nivel: classifyScore(score),
    ...overrides,
  };
}

describe('classifyScore (faixas 1-25)', () => {
  it('1 a 4 é Baixo', () => {
    expect(classifyScore(1)).toBe('Baixo');
    expect(classifyScore(4)).toBe('Baixo');
  });
  it('5 a 10 é Médio', () => {
    expect(classifyScore(5)).toBe('Médio');
    expect(classifyScore(10)).toBe('Médio');
  });
  it('11 a 17 é Alto', () => {
    expect(classifyScore(11)).toBe('Alto');
    expect(classifyScore(17)).toBe('Alto');
  });
  it('18 a 25 é Crítico', () => {
    expect(classifyScore(18)).toBe('Crítico');
    expect(classifyScore(25)).toBe('Crítico');
  });
});

describe('escalonarUmNivel', () => {
  it('sobe um nível por vez', () => {
    expect(escalonarUmNivel('Baixo')).toBe('Médio');
    expect(escalonarUmNivel('Médio')).toBe('Alto');
    expect(escalonarUmNivel('Alto')).toBe('Crítico');
  });
  it('não passa de Crítico', () => {
    expect(escalonarUmNivel('Crítico')).toBe('Crítico');
  });
});

describe('aggregateRisk — risco por categoria (regra 2)', () => {
  it('usa o MAX dos itens, não a média', () => {
    // impacto 5 (score 25, Crítico) e vários impacto 1 (score 5, Médio) --
    // a média ficaria bem abaixo de Crítico, mas a regra é MAX.
    const items = [
      item({ categoria: 'DP', impacto: 5 }),
      item({ categoria: 'DP', impacto: 1 }),
      item({ categoria: 'DP', impacto: 1 }),
    ];
    const result = aggregateRisk(items, ['DP']);
    expect(result.categorias[0].nivel).toBe('Crítico');
    expect(result.categorias[0].scoreMaximo).toBe(25);
  });

  it('sem itens na categoria, fica Baixo (score 0)', () => {
    const result = aggregateRisk([], ['SST']);
    expect(result.categorias[0].nivel).toBe('Baixo');
    expect(result.categorias[0].scoreMaximo).toBe(0);
  });

  it('3 ou mais itens em Alto/Crítico na mesma categoria escalona um nível (risco sistêmico)', () => {
    // 3 itens impacto 3 (score 15, Alto) -- MAX sozinho já seria Alto, mas
    // com 3+ itens no mesmo nível grave, sobe pra Crítico.
    const items = [
      item({ categoria: 'SST', impacto: 3 }),
      item({ categoria: 'SST', impacto: 3 }),
      item({ categoria: 'SST', impacto: 3 }),
    ];
    const result = aggregateRisk(items, ['SST']);
    expect(result.categorias[0].itemsAltoOuCritico).toBe(3);
    expect(result.categorias[0].escalado).toBe(true);
    expect(result.categorias[0].nivel).toBe('Crítico');
  });

  it('2 itens em Alto/Crítico NÃO escalona (fica no nível base)', () => {
    const items = [item({ categoria: 'SST', impacto: 3 }), item({ categoria: 'SST', impacto: 3 })];
    const result = aggregateRisk(items, ['SST']);
    expect(result.categorias[0].escalado).toBe(false);
    expect(result.categorias[0].nivel).toBe('Alto');
  });
});

describe('aggregateRisk — risco geral (regra 3, nunca média)', () => {
  it('uma categoria em Crítico torna o geral Crítico, mesmo com as outras em Baixo', () => {
    // Reproduz o bug relatado: colaborador com 0% de conformidade documental
    // (impacto 5 × probabilidade 5 = score 25 = Crítico) precisa tornar o
    // Risco Geral Crítico, não "Baixo" por causa das outras categorias.
    const items = [
      item({ categoria: 'DP', impacto: 5, mensagem: 'Colaborador 0% conforme' }),
      item({ categoria: 'SST', impacto: 1 }),
      item({ categoria: 'Compliance', impacto: 1 }),
    ];
    const result = aggregateRisk(items, ['DP', 'SST', 'Compliance', 'Psicologia']);
    expect(result.riscoGeral.nivel).toBe('Crítico');
    expect(result.riscoGeral.categoria).toBe('DP');
    expect(result.riscoGeral.item?.mensagem).toBe('Colaborador 0% conforme');
  });

  it('sem nenhum item em nenhuma categoria, geral é Baixo', () => {
    const result = aggregateRisk([], ['DP', 'SST', 'Compliance', 'Psicologia']);
    expect(result.riscoGeral.nivel).toBe('Baixo');
    expect(result.riscoGeral.categoria).toBeNull();
    expect(result.riscoGeral.item).toBeNull();
  });
});
