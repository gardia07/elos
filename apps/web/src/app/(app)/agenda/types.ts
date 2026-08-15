export type AgendaItemTipo = 'REUNIAO' | 'PRAZO' | 'TAREFA' | 'PESSOAL' | 'LEMBRETE';

export const TIPO_LABEL: Record<AgendaItemTipo, string> = {
  REUNIAO: 'Evento',
  PRAZO: 'Prazo',
  TAREFA: 'Tarefa',
  PESSOAL: 'Pessoal',
  LEMBRETE: 'Lembrete',
};

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  corDark: string;
  icone: string;
  ordem: number;
  sistema: boolean;
}

export interface AgendaItem {
  id: string;
  data: string;
  hora: string | null;
  horaFim: string | null;
  descricao: string;
  notas: string | null;
  tipo: AgendaItemTipo;
  categoriaId: string | null;
  categoria: Categoria | null;
  concluida: boolean;
  origem: string;
  recorrenciaId: string | null;
}

export type AgendaRecorrenciaFrequencia = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'PERSONALIZADA';

export const FREQUENCIA_LABEL: Record<AgendaRecorrenciaFrequencia, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  ANUAL: 'Anual',
  PERSONALIZADA: 'Personalizada',
};

export const DIA_SEMANA_CODES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;
export const DIA_SEMANA_LABEL: Record<(typeof DIA_SEMANA_CODES)[number], string> = {
  DOM: 'Dom',
  SEG: 'Seg',
  TER: 'Ter',
  QUA: 'Qua',
  QUI: 'Qui',
  SEX: 'Sex',
  SAB: 'Sáb',
};
export const DIA_SEMANA_LABEL_LONGO: Record<(typeof DIA_SEMANA_CODES)[number], string> = {
  DOM: 'domingo',
  SEG: 'segunda-feira',
  TER: 'terça-feira',
  QUA: 'quarta-feira',
  QUI: 'quinta-feira',
  SEX: 'sexta-feira',
  SAB: 'sábado',
};

export interface RecorrenciaInput {
  frequencia: AgendaRecorrenciaFrequencia;
  intervalo?: number;
  diasDaSemana?: string[];
  posicaoNoMes?: number;
  dataFim: string;
}

export type EventoOrigem =
  | 'AGENDA_ITEM'
  | 'LABOR_DEADLINE'
  | 'OCCUPATIONAL_EXAM'
  | 'NR_TRAINING'
  | 'VACATION_REQUEST'
  | 'TERMINATION'
  | 'TERMINATION_AVISO_FIM'
  | 'TERMINATION_PAGAMENTO'
  | 'DOCUMENT_REQUIREMENT';

export interface AgendaGeralEvento {
  id: string;
  origem: EventoOrigem;
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
  concluida: boolean;
  hora?: string | null;
  tipo?: AgendaItemTipo;
  notas?: string | null;
  categoriaId?: string | null;
  recorrenciaId?: string | null;
}

export type AgendaView = 'mes' | 'semana' | 'dia' | 'lista';

/** Formato unificado usado pelas visões de calendário, combinando itens pessoais (editáveis) e prazos agregados de outros módulos (só-leitura). */
export interface CalendarEvent {
  id: string;
  origem: EventoOrigem;
  data: string;
  hora: string | null;
  horaFim: string | null;
  titulo: string;
  categoriaId: string | null;
  concluida: boolean;
  editable: boolean;
  notas?: string | null;
  tipo?: AgendaItemTipo;
  hub?: string;
  raw?: AgendaItem;
}

/** Cor de fallback para eventos que vêm de outras origens (sem categoria própria), por hub. */
export const HUB_FALLBACK_COLOR: Record<string, string> = {
  'Área de trabalho': '#8A7FB0',
  DP: '#3b82f6',
  SST: '#b06a5e',
  'Gestão de Pessoas': '#c9a227',
};
