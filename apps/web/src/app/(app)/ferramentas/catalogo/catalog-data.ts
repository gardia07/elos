export interface CatalogTool {
  nome: string;
  /** null = ainda não construída nesta fase, exibida como "Em breve". */
  href: string | null;
}

export interface CatalogBlock {
  titulo: string;
  /** Código do módulo em TenantLicense.modulos — null = sempre visível (Pacote ELOS). */
  modulo: string | null;
  ferramentas: CatalogTool[];
}

export const CATALOG_BLOCKS: CatalogBlock[] = [
  {
    titulo: 'Pacote ELOS',
    modulo: null,
    ferramentas: [
      { nome: 'Editor de texto', href: null },
      { nome: 'Planilhas', href: null },
      { nome: 'Criador de artes', href: null },
      { nome: 'Planner pessoal', href: '/planner' },
      { nome: 'Bloco de notas', href: '/agenda?view=dia' },
      { nome: 'Biblioteca de referência', href: null },
    ],
  },
  {
    titulo: 'Departamento Pessoal',
    modulo: 'dp',
    ferramentas: [
      { nome: 'Banco de horas / ponto', href: '/dp/ponto' },
      { nome: 'Calculadora de rescisão', href: '/dp/simulacoes' },
      { nome: 'Calculadora de férias e 13º', href: '/dp/simulacoes' },
      { nome: 'INSS/IRRF e custo total do colaborador', href: '/dp/custos' },
      { nome: 'Checklist de admissão', href: '/cadastros/checklist-admissao' },
      { nome: 'Checklist de desligamento', href: '/cadastros/checklist-desligamento' },
    ],
  },
  {
    titulo: 'Gestão de Pessoas',
    modulo: 'rh',
    ferramentas: [
      { nome: 'PDI', href: null },
      { nome: 'Matriz Nine Box', href: null },
      { nome: 'Pesquisa de clima organizacional', href: null },
      { nome: 'Avaliação de desempenho', href: '/gestao-de-pessoas/avaliacao' },
      { nome: 'Controle de férias da equipe', href: '/gestao-de-pessoas/ferias' },
    ],
  },
  {
    titulo: 'Saúde e Segurança do Trabalho',
    modulo: 'sst',
    ferramentas: [
      { nome: 'Calculadora de insalubridade/periculosidade', href: null },
      { nome: 'Gestão de CAT', href: '/sst/acidentes' },
      { nome: 'Controle de ASO', href: '/sst/exames' },
    ],
  },
  {
    titulo: 'Compliance',
    modulo: 'compliance',
    ferramentas: [
      { nome: 'Calendário de obrigações', href: '/dp/prazos' },
      { nome: 'Biblioteca de normas e legislação', href: null },
    ],
  },
  {
    titulo: 'Psicologia',
    modulo: 'psicologia',
    ferramentas: [
      { nome: 'Banco de testes e instrumentos', href: null },
      { nome: 'Modelos de laudos e pareceres', href: null },
      { nome: 'Roteiro de entrevista devolutiva/anamnese', href: null },
    ],
  },
];
