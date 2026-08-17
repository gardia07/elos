export interface Meta {
  id: string;
  titulo: string;
  concluida: boolean;
  ordem: number;
  ano: number;
}

export interface Habito {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ano: number;
  diasMarcados: string[];
  streakAtual: number;
  streakRecorde: number;
}

export type FinancaTipo = 'RECEITA' | 'DESPESA';

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: FinancaTipo;
  ordem: number;
  valoresPorMes: Record<string, number>;
}

export interface HumorRegistro {
  id: string;
  data: string;
  nivel: number;
  nota: string | null;
}

export interface CicloRegistro {
  id: string;
  dataInicio: string;
  duracaoDias: number | null;
  sintomas: string | null;
}

export interface PesoMedidaRegistro {
  id: string;
  data: string;
  pesoKg: number | null;
  alturaCm: number | null;
  cinturaCm: number | null;
  quadrilCm: number | null;
  bracoCm: number | null;
  aguaMl: number | null;
  notas: string | null;
}

export interface RodaDaVidaAvaliacao {
  id: string;
  data: string;
  carreira: number;
  financas: number;
  saude: number;
  familiaAmigos: number;
  relacionamento: number;
  crescimentoPessoal: number;
  lazer: number;
  ambienteFisico: number;
}

export interface RevisaoMensal {
  id: string;
  ano: number;
  mes: number;
  intencoes: string | null;
  oQueFuncionou: string | null;
  oQueNaoFuncionou: string | null;
  oQuePrecisaMudar: string | null;
}
