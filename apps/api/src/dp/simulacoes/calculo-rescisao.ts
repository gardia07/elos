import {
  AVISO_INDENIZADO_FRACAO_POR_TIPO,
  FGTS_ALIQUOTA,
  MULTA_FGTS_POR_TIPO,
  TipoRescisao,
  anosCompletos,
  diasAvisoPrevio,
  mesesCompletos,
} from './constantes-trabalhistas';

export const AVISO_SIMULACAO =
  'Simulação estimada — não substitui o cálculo oficial da contabilidade.';

export interface CalculoRescisaoInput {
  salario: number;
  dataAdmissao: Date;
  feriasSaldo: number;
  tipo: TipoRescisao;
  dataPrevista: Date;
  saldoFgtsEstimado?: number;
}

export interface CalculoRescisaoResultado {
  parametros: {
    tipo: TipoRescisao;
    dataPrevista: string;
    anosCompletos: number;
  };
  saldoSalario: number;
  avisoPrevio: { dias: number; valorIndenizado: number };
  decimoTerceiroProporcional: number;
  ferias: { dias: number; valor: number; tercoConstitucional: number };
  fgts: {
    saldoConsiderado: number;
    saldoInformadoPeloUsuario: boolean;
    percentualMulta: number;
    valorMulta: number;
  };
  totalBruto: number;
  aviso: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cálculo puro de verbas rescisórias — sem acesso a banco, reaproveitado tanto pela simulação avulsa
 * (`SimulacoesService.simularRescisao`) quanto pelo cálculo gravado no processo de desligamento
 * (`TerminationsService.calcular`), pra manter a mesma matemática nos dois lugares.
 */
export function calcularRescisao(
  input: CalculoRescisaoInput,
): CalculoRescisaoResultado {
  const {
    salario,
    dataAdmissao,
    feriasSaldo,
    tipo,
    dataPrevista,
    saldoFgtsEstimado,
  } = input;
  const valorDiaria = salario / 30;

  const anos = anosCompletos(dataAdmissao, dataPrevista);
  const mesesTotais = mesesCompletos(dataAdmissao, dataPrevista);

  // Saldo de salário: dias trabalhados no mês da rescisão.
  const saldoSalario = round2(valorDiaria * dataPrevista.getDate());

  // Aviso prévio indenizado: integral sem justa causa/rescisão indireta, metade no acordo, zero nos demais.
  const diasAviso = diasAvisoPrevio(anos);
  const avisoIndenizado = round2(
    valorDiaria * diasAviso * AVISO_INDENIZADO_FRACAO_POR_TIPO[tipo],
  );

  // 13º proporcional: meses completos trabalhados desde janeiro do ano da rescisão (mês com 15+ dias conta como completo).
  const inicioAno = new Date(dataPrevista.getFullYear(), 0, 1);
  const mesesNoAno = Math.min(12, mesesCompletos(inicioAno, dataPrevista) + 1);
  const decimoTerceiroProporcional = round2((salario / 12) * mesesNoAno);

  // Férias a indenizar: usa o saldo de dias já rastreado pelo cadastro do colaborador (Employee.feriasSaldo),
  // que já reflete vencidas + proporcionais descontado do que foi gozado — evita recalcular em paralelo e divergir do módulo de férias.
  const diasFerias = feriasSaldo;
  const valorFerias = round2(valorDiaria * diasFerias);
  const tercoFerias = round2(valorFerias / 3);

  // Multa do FGTS: usa o saldo informado pelo usuário, ou uma estimativa grosseira de 8% do salário por mês trabalhado
  // (não considera saques, variações salariais ao longo do tempo nem outros depósitos — por isso é só um ponto de partida).
  const saldoFgts =
    saldoFgtsEstimado ?? round2(salario * FGTS_ALIQUOTA * mesesTotais);
  const multaFgts = round2(saldoFgts * MULTA_FGTS_POR_TIPO[tipo]);

  const totalBruto = round2(
    saldoSalario +
      avisoIndenizado +
      decimoTerceiroProporcional +
      valorFerias +
      tercoFerias +
      multaFgts,
  );

  return {
    parametros: {
      tipo,
      dataPrevista: dataPrevista.toISOString().slice(0, 10),
      anosCompletos: anos,
    },
    saldoSalario,
    avisoPrevio: { dias: diasAviso, valorIndenizado: avisoIndenizado },
    decimoTerceiroProporcional,
    ferias: {
      dias: diasFerias,
      valor: valorFerias,
      tercoConstitucional: tercoFerias,
    },
    fgts: {
      saldoConsiderado: saldoFgts,
      saldoInformadoPeloUsuario: saldoFgtsEstimado != null,
      percentualMulta: MULTA_FGTS_POR_TIPO[tipo],
      valorMulta: multaFgts,
    },
    totalBruto,
    aviso: AVISO_SIMULACAO,
  };
}
