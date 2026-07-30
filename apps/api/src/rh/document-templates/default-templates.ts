const TERMINATION_TIPOS = [
  'SEM_JUSTA_CAUSA',
  'PEDIDO_DEMISSAO',
  'ACORDO',
  'JUSTA_CAUSA',
  'ACORDO_MUTUO',
  'FIM_CONTRATO_EXPERIENCIA',
  'APOSENTADORIA',
  'RESCISAO_INDIRETA',
  'OBITO',
] as const;

const TIPO_LABEL: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
  JUSTA_CAUSA: 'Justa causa',
  ACORDO_MUTUO: 'Acordo mútuo (art. 484-A)',
  FIM_CONTRATO_EXPERIENCIA: 'Fim de contrato de experiência',
  APOSENTADORIA: 'Aposentadoria',
  RESCISAO_INDIRETA: 'Rescisão indireta',
  OBITO: 'Óbito',
};

const AVISO_PREVIO_CORPO = `{{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}`;

const TERMO_RESCISAO_CORPO = `TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}`;

const CARTA_REFERENCIA_CORPO = `CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}`;

const CONTRATO_ADMISSAO_CORPO = `CONTRATO INDIVIDUAL DE TRABALHO

De um lado {{empresa.razaoSocial}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, com sede em {{empresa.cidade}}/{{empresa.uf}}, doravante denominada Empregadora, e de outro {{admissao.nome}}, doravante denominado(a) Empregado(a), têm entre si justo o presente contrato de trabalho, mediante as seguintes condições:

Cargo: {{admissao.cargo}}
Data de início: {{admissao.dataInicio}}
Remuneração: {{admissao.salario}}

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{admissao.nome}}`;

export interface DefaultDocumentTemplate {
  tipo: 'AVISO_PREVIO' | 'TERMO_RESCISAO' | 'CARTA_REFERENCIA' | 'CONTRATO_ADMISSAO';
  nome: string;
  aplicaTipos: string[];
  corpo: string;
}

export const DEFAULT_DOCUMENT_TEMPLATES: DefaultDocumentTemplate[] = [
  ...TERMINATION_TIPOS.map((tipo) => ({
    tipo: 'AVISO_PREVIO' as const,
    nome: `Aviso prévio — ${TIPO_LABEL[tipo]}`,
    aplicaTipos: [tipo],
    corpo: AVISO_PREVIO_CORPO,
  })),
  ...TERMINATION_TIPOS.map((tipo) => ({
    tipo: 'TERMO_RESCISAO' as const,
    nome: `Termo de rescisão — ${TIPO_LABEL[tipo]}`,
    aplicaTipos: [tipo],
    corpo: TERMO_RESCISAO_CORPO,
  })),
  ...TERMINATION_TIPOS.map((tipo) => ({
    tipo: 'CARTA_REFERENCIA' as const,
    nome: `Carta de referência — ${TIPO_LABEL[tipo]}`,
    aplicaTipos: [tipo],
    corpo: CARTA_REFERENCIA_CORPO,
  })),
  {
    tipo: 'CONTRATO_ADMISSAO' as const,
    nome: 'Contrato de admissão',
    aplicaTipos: [],
    corpo: CONTRATO_ADMISSAO_CORPO,
  },
];
