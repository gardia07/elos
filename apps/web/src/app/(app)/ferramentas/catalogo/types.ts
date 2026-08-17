export interface AtalhoExterno {
  id: string;
  nome: string;
  url: string;
  icone: string;
  tipo: 'LINK_SIMPLES' | 'WIDGET_VIVO';
  sistema: boolean;
}
