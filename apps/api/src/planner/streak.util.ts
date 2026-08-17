const UM_DIA_MS = 86_400_000;

export interface StreakInfo {
  atual: number;
  recorde: number;
}

/** `datas` são datas UTC-midnight (uma por dia marcado), em qualquer ordem/duplicadas. */
export function computeStreak(datas: Date[], hojeUtc: Date): StreakInfo {
  if (datas.length === 0) return { atual: 0, recorde: 0 };
  const dias = new Set(datas.map((d) => d.getTime()));
  const ordenadas = [...dias].sort((a, b) => a - b);

  let recorde = 1;
  let corrida = 1;
  for (let i = 1; i < ordenadas.length; i++) {
    corrida = ordenadas[i] - ordenadas[i - 1] === UM_DIA_MS ? corrida + 1 : 1;
    if (corrida > recorde) recorde = corrida;
  }

  // Sequência atual: conta pra trás a partir de hoje — ou de ontem, se hoje ainda não foi marcado
  // (o dia não acabou, então a sequência não deve parecer quebrada só porque ainda são 9h da manhã).
  let atual = 0;
  let cursor = dias.has(hojeUtc.getTime()) ? hojeUtc.getTime() : hojeUtc.getTime() - UM_DIA_MS;
  while (dias.has(cursor)) {
    atual += 1;
    cursor -= UM_DIA_MS;
  }

  return { atual, recorde };
}
