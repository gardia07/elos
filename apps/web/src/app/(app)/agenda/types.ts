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

export type TarefaProjetoStatus = 'A_FAZER' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export const TAREFA_PROJETO_STATUS_LABEL: Record<TarefaProjetoStatus, string> = {
  A_FAZER: 'A fazer',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

export type AgendaItemPrioridade = 'P0' | 'P1' | 'P2' | 'P3';

export const PRIORIDADE_LABEL: Record<AgendaItemPrioridade, string> = {
  P0: 'P0 — Crítica',
  P1: 'P1 — Alta',
  P2: 'P2 — Média',
  P3: 'P3 — Baixa',
};

export const PRIORIDADE_COR: Record<AgendaItemPrioridade, string> = {
  P0: '#c0392b',
  P1: '#c9a227',
  P2: '#3b82f6',
  P3: '#8a97a6',
};

export interface Subtarefa {
  id: string;
  titulo: string;
  concluida: boolean;
  ordem: number;
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
  responsavelId: string | null;
  projetoId: string | null;
  statusProjeto?: TarefaProjetoStatus;
  prioridade?: AgendaItemPrioridade | null;
  bloqueadoPorId?: string | null;
  lembretes?: { antecedenciaDias: number; notificarEmail: boolean }[];
}

export type ProjetoStatus = 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'EM_RISCO' | 'CANCELADO';

export const PROJETO_STATUS_LABEL: Record<ProjetoStatus, string> = {
  PLANEJADO: 'Planejado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  EM_RISCO: 'Em risco',
  CANCELADO: 'Cancelado',
};

export const PROJETO_STATUS_TONE: Record<ProjetoStatus, 'grey' | 'blue' | 'green' | 'amber' | 'red'> = {
  PLANEJADO: 'grey',
  EM_ANDAMENTO: 'blue',
  CONCLUIDO: 'green',
  EM_RISCO: 'amber',
  CANCELADO: 'red',
};

export interface ProjetoParticipante {
  userId: string;
  nome: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  dataInicio: string;
  dataFim: string | null;
  status: ProjetoStatus;
  cor: string;
  wipLimiteEmAndamento: number | null;
  criadoPorId: string;
  participantes: ProjetoParticipante[];
  totalTarefas: number;
  tarefasConcluidas: number;
  progresso: number;
  atrasado: boolean;
}

export interface ProjetoMetricas {
  total: number;
  concluidas: number;
  leadTimeMedioDias: number | null;
  throughputUltimos7Dias: number;
}

export interface ProjetoMarco {
  id: string;
  titulo: string;
  data: string;
  concluido: boolean;
  ordem: number;
}

export interface ProjetoModeloItem {
  titulo: string;
  diasAposInicio: number;
}

export interface ProjetoModelo {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  criadoPorId: string;
  tarefas: ProjetoModeloItem[];
  marcos: ProjetoModeloItem[];
}

export interface Usuario {
  id: string;
  name: string;
  role: string;
}

export interface Comentario {
  id: string;
  autor: string;
  texto: string;
  createdAt: string;
}

export interface AuditEvento {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
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
  | 'DOCUMENT_REQUIREMENT'
  | 'ANIVERSARIO_COLABORADOR'
  | 'ANIVERSARIO_ADMISSAO';

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
  responsavelId?: string | null;
  projetoId?: string | null;
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
  projetoId?: string | null;
  raw?: AgendaItem;
}

/** Cor de fallback para eventos que vêm de outras origens (sem categoria própria), por hub. */
export const HUB_FALLBACK_COLOR: Record<string, string> = {
  'Área de trabalho': '#8A7FB0',
  DP: '#3b82f6',
  SST: '#b06a5e',
  'Gestão de Pessoas': '#c9a227',
};
