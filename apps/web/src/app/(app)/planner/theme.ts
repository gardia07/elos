import { ClipboardList, Compass, Flame, HeartPulse, LayoutDashboard, Ruler, Smile, Target, Wallet } from 'lucide-react';

export type SecaoId = 'dashboard' | 'metas' | 'habitos' | 'financas' | 'humor' | 'ciclo' | 'peso' | 'roda' | 'revisao';

export interface SecaoTema {
  id: SecaoId;
  label: string;
  descricao: string;
  icon: typeof Target;
  cor: string;
}

export const SECOES: SecaoTema[] = [
  { id: 'dashboard', label: 'Dashboard', descricao: 'Sua evolução pessoal, tudo num só lugar.', icon: LayoutDashboard, cor: '#5b6b8c' },
  { id: 'metas', label: 'Metas', descricao: 'Seus objetivos do ano, um passo de cada vez.', icon: Target, cor: '#c9a227' },
  { id: 'habitos', label: 'Hábitos', descricao: 'Constância gera resultado — acompanhe sua sequência.', icon: Flame, cor: '#b06a5e' },
  { id: 'financas', label: 'Finanças', descricao: 'Seu orçamento pessoal, mês a mês.', icon: Wallet, cor: '#6d8a3d' },
  { id: 'humor', label: 'Humor', descricao: 'Como você tem se sentido nos últimos dias.', icon: Smile, cor: '#3b82f6' },
  { id: 'ciclo', label: 'Ciclo', descricao: 'Acompanhamento do ciclo menstrual.', icon: HeartPulse, cor: '#e0729b' },
  { id: 'peso', label: 'Peso e medidas', descricao: 'Evolução do seu corpo ao longo do ano.', icon: Ruler, cor: '#8A7FB0' },
  { id: 'roda', label: 'Roda da vida', descricao: 'Sua satisfação em 8 áreas da vida, num relance.', icon: Compass, cor: '#4a9b8e' },
  { id: 'revisao', label: 'Revisão mensal', descricao: 'Intenção no início do mês, reflexão no fim.', icon: ClipboardList, cor: '#d4914a' },
];
