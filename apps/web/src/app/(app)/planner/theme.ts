import { Flame, HeartPulse, Ruler, Smile, Target, Wallet } from 'lucide-react';

export type SecaoId = 'metas' | 'habitos' | 'financas' | 'humor' | 'ciclo' | 'peso';

export interface SecaoTema {
  id: SecaoId;
  label: string;
  descricao: string;
  icon: typeof Target;
  cor: string;
}

export const SECOES: SecaoTema[] = [
  { id: 'metas', label: 'Metas', descricao: 'Seus objetivos do ano, um passo de cada vez.', icon: Target, cor: '#c9a227' },
  { id: 'habitos', label: 'Hábitos', descricao: 'Constância gera resultado — acompanhe sua sequência.', icon: Flame, cor: '#b06a5e' },
  { id: 'financas', label: 'Finanças', descricao: 'Seu orçamento pessoal, mês a mês.', icon: Wallet, cor: '#6d8a3d' },
  { id: 'humor', label: 'Humor', descricao: 'Como você tem se sentido nos últimos dias.', icon: Smile, cor: '#3b82f6' },
  { id: 'ciclo', label: 'Ciclo', descricao: 'Acompanhamento do ciclo menstrual.', icon: HeartPulse, cor: '#e0729b' },
  { id: 'peso', label: 'Peso e medidas', descricao: 'Evolução do seu corpo ao longo do ano.', icon: Ruler, cor: '#8A7FB0' },
];
