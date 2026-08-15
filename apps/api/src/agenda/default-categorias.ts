/** As 4 categorias-padrão de agenda (spec §6.4), semeadas para todo tenant novo em AuthService.provisionNewTenant. */
export const DEFAULT_AGENDA_CATEGORIAS = [
  { nome: 'RH — Legal/Prazo', cor: '#b06a5e', corDark: '#d98b7e', icone: 'AlertTriangle', ordem: 0 },
  { nome: 'RH — Rotina', cor: '#3b82f6', corDark: '#6fa8fa', icone: 'Users', ordem: 1 },
  { nome: 'Pessoal/Equipe', cor: '#6d8a3d', corDark: '#92b563', icone: 'PartyPopper', ordem: 2 },
  { nome: 'Anotação/Lembrete', cor: '#c9a227', corDark: '#e6c358', icone: 'StickyNote', ordem: 3 },
] as const;
