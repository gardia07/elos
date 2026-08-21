/**
 * Motor de soma de afastamentos pelo mesmo CID dentro da janela de 60 dias
 * (Lei 8.213/91, art. 60 §3º; Decreto 3.048/99, art. 75, §§3º-5º) -- funções
 * puras, sem acesso a banco, mesmo espírito de rh/ferias/regras-ferias.util.ts.
 *
 * Deliberadamente sem estado persistido: dado o conjunto de LeaveRecord de um
 * episódio, tudo (dias acumulados, split empresa/INSS, janela de 60 dias,
 * status aberto/encerrado) é recalculado aqui -- nunca lido de uma coluna
 * cacheada, pra nunca desalinhar (mesmo raciocínio de PeriodoAquisitivo).
 */

/** Primeiros dias de afastamento por doença pagos pela empresa (salário integral) antes do INSS assumir. */
export const DIAS_RESPONSABILIDADE_EMPRESA = 15;

/** Janela, em dias corridos após o fim do afastamento mais recente, em que um novo afastamento do mesmo CID ainda soma na mesma cadeia. */
export const JANELA_RECAIDA_DIAS = 60;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export interface AfastamentoParaEpisodio {
  id: string;
  inicio: Date;
  retorno: Date | null;
  dataFimPrevista: Date | null;
}

/** Fim efetivo pra fins de cálculo: retorno real se já encerrado, senão a previsão do atestado, senão o próprio início (afastamento recém-lançado, sem nenhuma data de fim ainda). */
export function fimEfetivo(a: AfastamentoParaEpisodio): Date {
  return a.retorno ?? a.dataFimPrevista ?? a.inicio;
}

/** Dias corridos (inclusive) de um afastamento individual -- não é dias úteis. */
export function diasCorridos(a: AfastamentoParaEpisodio): number {
  return Math.round((fimEfetivo(a).getTime() - a.inicio.getTime()) / 86_400_000) + 1;
}

export interface EpisodioCalculado {
  diasAcumulados: number;
  diasResponsabilidadeEmpresa: number;
  diasResponsabilidadeInss: number;
  dataLimiteJanela60Dias: Date;
  status: 'ABERTO' | 'ENCERRADO';
}

/** Recalcula o episódio inteiro a partir de todos os afastamentos vinculados a ele (ordem não importa, a função ordena por início). */
export function calcularEpisodio(afastamentos: AfastamentoParaEpisodio[], hoje: Date = new Date()): EpisodioCalculado {
  if (afastamentos.length === 0) {
    throw new Error('Episódio sem nenhum afastamento vinculado -- não deveria existir.');
  }
  const ordenados = [...afastamentos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const diasAcumulados = ordenados.reduce((soma, a) => soma + diasCorridos(a), 0);
  const maisRecente = ordenados.reduce((max, a) => (fimEfetivo(a) > fimEfetivo(max) ? a : max));
  const dataLimiteJanela60Dias = addDays(fimEfetivo(maisRecente), JANELA_RECAIDA_DIAS);
  return {
    diasAcumulados,
    diasResponsabilidadeEmpresa: Math.min(DIAS_RESPONSABILIDADE_EMPRESA, diasAcumulados),
    diasResponsabilidadeInss: Math.max(0, diasAcumulados - DIAS_RESPONSABILIDADE_EMPRESA),
    dataLimiteJanela60Dias,
    status: dataLimiteJanela60Dias >= hoje ? 'ABERTO' : 'ENCERRADO',
  };
}

/** Um novo afastamento do mesmo CID ainda entra na cadeia de um episódio existente? */
export function dentroDaJanelaDeRecaida(dataLimiteJanela60Dias: Date, novoInicio: Date): boolean {
  return dataLimiteJanela60Dias >= novoInicio;
}

export interface ResponsabilidadeAfastamento {
  diasCorridos: number;
  diasResponsabilidadeEmpresa: number;
  diasResponsabilidadeInss: number;
  /** Recaída: já havia dias acumulados no episódio antes deste afastamento entrar -- é o que alimenta o alerta e o infoMesmoMtv do S-2230. */
  recaida: boolean;
}

/**
 * Responsabilidade de pagamento do afastamento recém-lançado, dado o estado
 * do episódio *antes* de somar este período (spec §4.2, item 3): se a
 * empresa já esgotou os 15 dias na cadeia, o novo afastamento inteiro é INSS
 * desde o 1º dia; senão, a empresa cobre só o que falta pra completar 15
 * dias acumulados, e o excedente já nasce INSS.
 */
export function calcularResponsabilidadeDoAfastamento(diasAcumuladosAntes: number, afastamento: AfastamentoParaEpisodio): ResponsabilidadeAfastamento {
  const dias = diasCorridos(afastamento);
  const saldoEmpresa = Math.max(0, DIAS_RESPONSABILIDADE_EMPRESA - diasAcumuladosAntes);
  const diasResponsabilidadeEmpresa = Math.min(dias, saldoEmpresa);
  return {
    diasCorridos: dias,
    diasResponsabilidadeEmpresa,
    diasResponsabilidadeInss: dias - diasResponsabilidadeEmpresa,
    recaida: diasAcumuladosAntes > 0,
  };
}
