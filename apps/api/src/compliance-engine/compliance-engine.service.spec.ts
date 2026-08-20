import { pontuarPendencia } from './compliance-engine.service';

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe('pontuarPendencia (regra 5 -- índice de conformidade)', () => {
  it('bloqueante vencida = -3', () => {
    expect(
      pontuarPendencia({ status: 'VENCIDA', dataLimite: d('2026-01-01'), dataConclusao: null, regra: { bloqueante: true } }),
    ).toBe(-3);
  });

  it('não-bloqueante vencida = -1', () => {
    expect(
      pontuarPendencia({ status: 'VENCIDA', dataLimite: d('2026-01-01'), dataConclusao: null, regra: { bloqueante: false } }),
    ).toBe(-1);
  });

  it('bloqueante aberta, ainda no prazo = -1', () => {
    expect(
      pontuarPendencia({ status: 'ABERTA', dataLimite: d('2026-01-01'), dataConclusao: null, regra: { bloqueante: true } }),
    ).toBe(-1);
  });

  it('não-bloqueante aberta, ainda no prazo = 0 (não penaliza, mas não pontua)', () => {
    expect(
      pontuarPendencia({ status: 'EM_ANDAMENTO', dataLimite: d('2026-01-01'), dataConclusao: null, regra: { bloqueante: false } }),
    ).toBe(0);
  });

  it('concluída dentro do prazo = +1, bloqueante ou não', () => {
    expect(
      pontuarPendencia({ status: 'CONCLUIDA', dataLimite: d('2026-01-10'), dataConclusao: d('2026-01-05'), regra: { bloqueante: true } }),
    ).toBe(1);
    expect(
      pontuarPendencia({ status: 'CONCLUIDA', dataLimite: d('2026-01-10'), dataConclusao: d('2026-01-05'), regra: { bloqueante: false } }),
    ).toBe(1);
  });

  it('concluída DEPOIS do prazo não ganha o bônus -- bloqueante ainda penaliza', () => {
    expect(
      pontuarPendencia({ status: 'CONCLUIDA', dataLimite: d('2026-01-01'), dataConclusao: d('2026-01-10'), regra: { bloqueante: true } }),
    ).toBe(-1);
    expect(
      pontuarPendencia({ status: 'CONCLUIDA', dataLimite: d('2026-01-01'), dataConclusao: d('2026-01-10'), regra: { bloqueante: false } }),
    ).toBe(0);
  });
});
