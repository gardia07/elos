'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  complianceTone,
  maskCPF,
  maskPhoneBR,
  statusColaboradorLabel,
  statusColaboradorTone,
  TERMINATION_STATUS_LABEL,
  TERMINATION_STATUS_TONE,
  TERMINATION_TIPO_LABEL,
  TerminationStatusValue,
  TerminationTipo,
} from '@/lib/format';
import { Badge, Button, Card, EmptyState, KpiCard, Switch } from '@/components/ui';
import { type TenantInfo } from '@/components/empresa-form';

const ESCOLARIDADE_OPTIONS = [
  'Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo',
  'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
];
const ESTADO_CIVIL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'];
const GENERO_OPTIONS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];
const CNH_CATEGORIA_OPTIONS = ['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'];
const RACA_COR_OPTIONS = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não informado'];
const TIPOS_AFASTAMENTO = ['INSS (auxílio-doença)', 'Licença maternidade', 'Licença paternidade', 'Atestado médico', 'Outro'];

const ACCIDENT_TIPO_LABEL: Record<'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL', string> = {
  TIPICO: 'Acidente típico',
  TRAJETO: 'Acidente de trajeto',
  DOENCA_OCUPACIONAL: 'Doença ocupacional',
};

function enderecoTenant(t: TenantInfo): string {
  const partes = [
    t.logradouro && t.numero ? `${t.logradouro}, ${t.numero}` : t.logradouro,
    t.complemento,
    t.bairro,
    t.cidade && t.uf ? `${t.cidade}/${t.uf}` : t.cidade,
    t.cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' - ') : '—';
}

const TIPO_CONTA_LABEL: Record<'CORRENTE' | 'POUPANCA', string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Conta poupança',
};

const TIPO_CONTRATO_LABEL: Record<'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE', string> = {
  CLT: 'CLT',
  ESTAGIO: 'Estágio',
  PJ: 'PJ',
  INTERMITENTE: 'Intermitente',
};
const TIPO_SALARIO_LABEL: Record<'MENSALISTA' | 'HORISTA' | 'DIARISTA', string> = {
  MENSALISTA: 'Mensalista',
  HORISTA: 'Horista',
  DIARISTA: 'Diarista',
};

interface DocumentRequirementStatus {
  id: string;
  requirementId: string;
  status: 'MISSING' | 'PENDING' | 'COMPLIANT' | 'EXPIRED' | 'REJECTED' | 'NAO_SE_APLICA';
  expiraEm: string | null;
  arquivoNome: string | null;
  anexadoEm: string | null;
  requirement: { nome: string; categoria: string; obrigatorio: boolean; sistema: boolean; validadeDias: number | null };
}

const DOC_STATUS_LABEL: Record<DocumentRequirementStatus['status'], string> = {
  MISSING: 'Faltante',
  PENDING: 'Em análise',
  COMPLIANT: 'Conforme',
  EXPIRED: 'Vencido',
  REJECTED: 'Não conforme',
  NAO_SE_APLICA: 'Não se aplica',
};

const DOC_STATUS_TONE: Record<DocumentRequirementStatus['status'], 'green' | 'blue' | 'amber' | 'red' | 'grey'> = {
  MISSING: 'grey',
  PENDING: 'blue',
  COMPLIANT: 'green',
  EXPIRED: 'red',
  REJECTED: 'red',
  NAO_SE_APLICA: 'grey',
};

type StatusPeriodoAquisitivo =
  | 'EM_AQUISICAO'
  | 'DISPONIVEL'
  | 'A_VENCER'
  | 'VENCIDA'
  | 'PARCIALMENTE_GOZADA'
  | 'QUITADA'
  | 'PERDIDO_POR_AFASTAMENTO';

const STATUS_PERIODO_LABEL: Record<StatusPeriodoAquisitivo, string> = {
  EM_AQUISICAO: 'Em aquisição',
  DISPONIVEL: 'Disponível',
  A_VENCER: 'A vencer',
  VENCIDA: 'Vencida',
  PARCIALMENTE_GOZADA: 'Parcialmente gozada',
  QUITADA: 'Quitada',
  PERDIDO_POR_AFASTAMENTO: 'Perdeu o direito — afastamento > 6 meses (art. 133 CLT)',
};

const STATUS_PERIODO_TONE: Record<StatusPeriodoAquisitivo, 'green' | 'blue' | 'amber' | 'red' | 'grey'> = {
  EM_AQUISICAO: 'grey',
  DISPONIVEL: 'green',
  A_VENCER: 'amber',
  VENCIDA: 'red',
  PARCIALMENTE_GOZADA: 'blue',
  QUITADA: 'grey',
  PERDIDO_POR_AFASTAMENTO: 'red',
};

type StatusFracaoFerias = 'PENDENTE' | 'APROVADA' | 'REPROVADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

const STATUS_FRACAO_LABEL: Record<StatusFracaoFerias, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REPROVADA: 'Reprovada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_FRACAO_TONE: Record<StatusFracaoFerias, 'green' | 'blue' | 'amber' | 'red' | 'grey'> = {
  PENDENTE: 'amber',
  APROVADA: 'blue',
  REPROVADA: 'red',
  EM_ANDAMENTO: 'green',
  CONCLUIDA: 'grey',
  CANCELADA: 'red',
};

interface FeriasHistoricoColaborador {
  periodos: {
    id: string;
    numero: number;
    dataInicio: string;
    dataFim: string;
    origemSuspensaoId: string | null;
    resumo: {
      dataLimiteConcessao: string;
      diasAdquiridos: number;
      diasGozados: number;
      diasVendidos: number;
      saldoDisponivel: number;
      status: StatusPeriodoAquisitivo;
      diasParaVencer: number | null;
    };
    fracoes: {
      id: string;
      tipo: 'NORMAL' | 'COLETIVA';
      dataInicio: string;
      dataFim: string;
      dias: number;
      diasAbono: number;
      antecipa13: boolean;
      status: StatusFracaoFerias;
      statusEfetivo: StatusFracaoFerias;
      justificativa: string | null;
      documentos: { id: string; nome: string }[];
    }[];
  }[];
}

interface EmployeeDetail {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  departamento: string;
  filial: string | null;
  gestorDireto: string | null;
  status: 'ATIVO' | 'INATIVO';
  conformidadeDocumental: number;
  dataAdmissao: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  contatosEmergencia: { id: string; nome: string; parentesco: string; telefone: string | null }[];
  cpf: string | null;
  rg: string | null;
  rgOrgaoExpedidor: string | null;
  rgDataExpedicao: string | null;
  dataNascimento: string | null;
  nacionalidade: string | null;
  estadoCivil: string | null;
  genero: string | null;
  escolaridade: string | null;
  cnh: string | null;
  cnhCategoria: string | null;
  cnhValidade: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  pis: string | null;
  ctps: string | null;
  tituloEleitor: string | null;
  tituloEleitorZona: string | null;
  tituloEleitorSecao: string | null;
  racaCor: string | null;
  pcd: boolean;
  conjugeNome: string | null;
  conjugeCpf: string | null;
  semDependentes: boolean;
  salario: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoConta: 'CORRENTE' | 'POUPANCA' | null;
  chavePix: string | null;
  tipoContrato: 'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  tipoSalario: 'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  feriasSaldo: number;
  feriasVencimento: string;
  feriasVencimentoAlerta: boolean;
  tempoDeCasa: { anos: number; meses: number };
  dependentes: { id: string; nome: string; parentesco: string; cpf: string | null; dataNascimento: string | null }[];
  historico: { id: string; evento: string; categoria: string; autor: string; data: string; revertivel: boolean }[];
  cargoSalarioHistorico: {
    id: string;
    vigenciaDesde: string;
    cargo: string;
    salario: string;
    motivo: string;
    observacao: string | null;
    registradoEm: string;
    registradoPor: string;
  }[];
  documentos: {
    id: string;
    nome: string;
    tipo: string;
    tamanho: string;
    uploadEm: string;
    terminationId: string | null;
    ocorrenciaId: string | null;
    vacationRequestId: string | null;
    leaveRecordId: string | null;
  }[];
  feriasHistorico: { id: string; periodo: string; dias: number }[];
  vacationRequests: {
    id: string;
    inicio: string;
    fim: string;
    diasAbono: number;
  }[];
  leaveRecords: { id: string; tipo: string; inicio: string; retorno: string | null }[];
  afastadoAtual: boolean;
  afastamentoAtivoTipo: string | null;
  ocorrencias: { id: string; tipo: string; data: string; descricao: string; autor: string }[];
  accidents: {
    id: string;
    tipoAcidente: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
    dataAcidente: string;
    comAfastamento: boolean;
    diasAfastamento: number;
    descricao: string | null;
  }[];
  terminations: { id: string; data: string; tipo: TerminationTipo; status: TerminationStatusValue; motivo: string | null }[];
  evaluationRecords: { id: string; autoNota: string | null; gestorNota: string | null; cycle: { nome: string } }[];
}

type EditFields = {
  email: string; telefone: string; endereco: string;
  dataNascimento: string; escolaridade: string; estadoCivil: string; nacionalidade: string;
  nomeMae: string; nomePai: string; genero: string; cnh: string; cnhCategoria: string; cnhValidade: string; rg: string;
  rgOrgaoExpedidor: string; rgDataExpedicao: string;
  tituloEleitor: string; tituloEleitorZona: string; tituloEleitorSecao: string; pis: string; ctps: string; cpf: string;
  racaCor: string; pcd: boolean;
  conjugeNome: string; conjugeCpf: string;
  matricula: string; dataAdmissao: string;
  cargo: string; departamento: string; filial: string; gestorDireto: string; tipoContrato: 'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  tipoSalario: 'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  salario: string;
  banco: string; agencia: string; conta: string; tipoConta: 'CORRENTE' | 'POUPANCA'; chavePix: string;
};

function toEditFields(e: EmployeeDetail): EditFields {
  return {
    email: e.email ?? '', telefone: e.telefone ?? '', endereco: e.endereco ?? '',
    dataNascimento: e.dataNascimento ? e.dataNascimento.slice(0, 10) : '',
    escolaridade: e.escolaridade ?? '', estadoCivil: e.estadoCivil ?? '', nacionalidade: e.nacionalidade ?? '',
    nomeMae: e.nomeMae ?? '', nomePai: e.nomePai ?? '', genero: e.genero ?? '', cnh: e.cnh ?? '',
    cnhCategoria: e.cnhCategoria ?? '', cnhValidade: e.cnhValidade ? e.cnhValidade.slice(0, 10) : '', rg: e.rg ?? '',
    rgOrgaoExpedidor: e.rgOrgaoExpedidor ?? '', rgDataExpedicao: e.rgDataExpedicao ? e.rgDataExpedicao.slice(0, 10) : '',
    tituloEleitor: e.tituloEleitor ?? '', tituloEleitorZona: e.tituloEleitorZona ?? '', tituloEleitorSecao: e.tituloEleitorSecao ?? '',
    pis: e.pis ?? '', ctps: e.ctps ?? '', cpf: e.cpf ?? '',
    racaCor: e.racaCor ?? '', pcd: e.pcd,
    conjugeNome: e.conjugeNome ?? '', conjugeCpf: e.conjugeCpf ?? '',
    matricula: e.matricula, dataAdmissao: e.dataAdmissao.slice(0, 10),
    cargo: e.cargo, departamento: e.departamento, filial: e.filial ?? '', gestorDireto: e.gestorDireto ?? '',
    tipoContrato: e.tipoContrato,
    tipoSalario: e.tipoSalario,
    salario: String(Number(e.salario)),
    banco: e.banco ?? '', agencia: e.agencia ?? '', conta: e.conta ?? '', tipoConta: e.tipoConta ?? 'CORRENTE', chavePix: e.chavePix ?? '',
  };
}

const TABS = ['geral', 'cargoSalario', 'ferias', 'afastamentos', 'beneficios', 'avaliacoes', 'documentos', 'desligamento', 'registro', 'ocorrencias', 'historico'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  geral: 'Visão geral',
  cargoSalario: 'Cargo e Salário',
  ferias: 'Férias',
  afastamentos: 'Afastamentos',
  beneficios: 'Benefícios',
  avaliacoes: 'Avaliações',
  documentos: 'Documentos',
  historico: 'Histórico',
  desligamento: 'Desligamento',
  registro: 'Registro de Empregado',
  ocorrencias: 'Ocorrências',
};

const OCORRENCIA_TIPOS = ['Advertência verbal', 'Advertência escrita', 'Suspensão', 'Elogio', 'Conflito/desentendimento', 'Outro'] as const;

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(v: string) {
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'geral');
  const [showPromote, setShowPromote] = useState(false);
  const [promoteMode, setPromoteMode] = useState<'salario' | 'cargo'>('salario');
  const [novoCargo, setNovoCargo] = useState('');
  const [novoSalario, setNovoSalario] = useState('');
  const [motivoPromocao, setMotivoPromocao] = useState<'Promoção' | 'Reajuste anual' | 'Dissídio coletivo' | 'Outro'>('Promoção');
  const [vigenciaPromocao, setVigenciaPromocao] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditFields | null>(null);
  const [motivoSalario, setMotivoSalario] = useState('');
  const [salarioVigenciaDesde, setSalarioVigenciaDesde] = useState('');
  const [saveEditError, setSaveEditError] = useState('');
  const [showDependenteForm, setShowDependenteForm] = useState(false);
  const [depNome, setDepNome] = useState('');
  const [depParentesco, setDepParentesco] = useState('');
  const [depCpf, setDepCpf] = useState('');
  const [depDataNascimento, setDepDataNascimento] = useState('');
  const [showContatoForm, setShowContatoForm] = useState(false);
  const [contatoNome, setContatoNome] = useState('');
  const [contatoParentesco, setContatoParentesco] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');
  const [progPeriodoId, setProgPeriodoId] = useState('');
  const [progInicio, setProgInicio] = useState('');
  const [progDias, setProgDias] = useState('');
  const [progDiasAbono, setProgDiasAbono] = useState('');
  const [progAntecipa13, setProgAntecipa13] = useState(false);
  const [progJustificativa, setProgJustificativa] = useState('');
  const [programarError, setProgramarError] = useState('');
  const [leaveTipo, setLeaveTipo] = useState(TIPOS_AFASTAMENTO[0]);
  const [leaveTipoOutro, setLeaveTipoOutro] = useState('');
  const [leaveInicio, setLeaveInicio] = useState('');
  const [leaveRetorno, setLeaveRetorno] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [docNome, setDocNome] = useState('');
  const [docTipo, setDocTipo] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const { data: e } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await api.get<EmployeeDetail>(`/rh/employees/${id}`)).data,
    enabled: !!id,
  });

  const { data: managers } = useQuery({
    queryKey: ['employees', 'managers', id],
    queryFn: async () =>
      (await api.get<{ id: string; nome: string; cargo: string; tipoContrato: string }[]>('/rh/employees/managers', { params: { excludeId: id } })).data,
    enabled: editing && !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employee', id] });

  const promote = useMutation({
    mutationFn: async () =>
      api.post(`/rh/employees/${id}/promote`, {
        cargo: novoCargo || undefined,
        salario: Number(novoSalario),
        motivo: motivoPromocao,
        vigenciaDesde: vigenciaPromocao || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setShowPromote(false);
      setNovoCargo('');
      setNovoSalario('');
      setMotivoPromocao('Promoção');
      setVigenciaPromocao('');
    },
  });

  const [editingHistoricoId, setEditingHistoricoId] = useState<string | null>(null);
  const [historicoVigencia, setHistoricoVigencia] = useState('');
  const [historicoCargo, setHistoricoCargo] = useState('');
  const [historicoSalario, setHistoricoSalario] = useState('');
  const [historicoMotivoCorrecao, setHistoricoMotivoCorrecao] = useState('');

  const updateHistorico = useMutation({
    mutationFn: async (historicoId: string) =>
      api.patch(`/rh/employees/${id}/cargo-salario-historico/${historicoId}`, {
        vigenciaDesde: historicoVigencia || undefined,
        cargo: historicoCargo || undefined,
        salario: historicoSalario ? Number(historicoSalario) : undefined,
        motivoCorrecao: historicoMotivoCorrecao,
      }),
    onSuccess: () => {
      invalidate();
      setEditingHistoricoId(null);
      setHistoricoMotivoCorrecao('');
    },
  });

  const [deletingHistoricoId, setDeletingHistoricoId] = useState<string | null>(null);
  const [historicoMotivoExclusao, setHistoricoMotivoExclusao] = useState('');

  const removeHistorico = useMutation({
    mutationFn: async (historicoId: string) =>
      api.delete(`/rh/employees/${id}/cargo-salario-historico/${historicoId}`, {
        data: { motivoCorrecao: historicoMotivoExclusao },
      }),
    onSuccess: () => {
      invalidate();
      setDeletingHistoricoId(null);
      setHistoricoMotivoExclusao('');
    },
  });

  const [revertingHistoricoId, setRevertingHistoricoId] = useState<string | null>(null);

  const revertHistorico = useMutation({
    mutationFn: async (historicoId: string) => api.post(`/rh/employees/${id}/historico/${historicoId}/reverter`),
    onMutate: (historicoId: string) => setRevertingHistoricoId(historicoId),
    onSuccess: () => invalidate(),
    onSettled: () => setRevertingHistoricoId(null),
  });

  const salarioAlterado = !!edit && !!e && Number(edit.salario) !== Number(e.salario);

  const saveEdit = useMutation({
    mutationFn: async () => {
      setSaveEditError('');
      return api.patch(`/rh/employees/${id}`, {
        ...edit,
        salario: edit ? Number(edit.salario) : undefined,
        motivoAlteracaoSalario: salarioAlterado ? motivoSalario : undefined,
        salarioVigenciaDesde: salarioAlterado ? salarioVigenciaDesde || undefined : undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setMotivoSalario('');
      setSalarioVigenciaDesde('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setSaveEditError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível salvar as alterações.');
    },
  });

  const addDependente = useMutation({
    mutationFn: async () =>
      api.post(`/rh/employees/${id}/dependentes`, {
        nome: depNome,
        parentesco: depParentesco,
        cpf: depCpf,
        dataNascimento: depDataNascimento || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setShowDependenteForm(false);
      setDepNome('');
      setDepParentesco('');
      setDepCpf('');
      setDepDataNascimento('');
    },
  });

  const toggleSemDependentes = useMutation({
    mutationFn: async (semDependentes: boolean) => api.patch(`/rh/employees/${id}`, { semDependentes }),
    onSuccess: invalidate,
  });

  const addContatoEmergencia = useMutation({
    mutationFn: async () =>
      api.post(`/rh/employees/${id}/contatos-emergencia`, { nome: contatoNome, parentesco: contatoParentesco, telefone: contatoTelefone || undefined }),
    onSuccess: () => {
      invalidate();
      setShowContatoForm(false);
      setContatoNome('');
      setContatoParentesco('');
      setContatoTelefone('');
    },
  });

  const removeContatoEmergencia = useMutation({
    mutationFn: async (contatoId: string) => api.delete(`/rh/employees/${id}/contatos-emergencia/${contatoId}`),
    onSuccess: invalidate,
  });

  const programarFerias = useMutation({
    mutationFn: async () =>
      api.post(`/rh/ferias/colaboradores/${id}/programar`, {
        periodoAquisitivoId: progPeriodoId,
        dataInicio: progInicio,
        dias: Number(progDias),
        diasAbono: progDiasAbono ? Number(progDiasAbono) : undefined,
        antecipa13: progAntecipa13 || undefined,
        justificativa: progJustificativa || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
      setProgInicio('');
      setProgDias('');
      setProgDiasAbono('');
      setProgAntecipa13(false);
      setProgJustificativa('');
      setProgramarError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setProgramarError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível programar as férias.');
    },
  });

  const aprovarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.patch(`/rh/ferias/fracoes/${fracaoId}/aprovar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] }),
  });
  const reprovarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.patch(`/rh/ferias/fracoes/${fracaoId}/reprovar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] }),
  });
  const cancelarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.delete(`/rh/ferias/fracoes/${fracaoId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] }),
  });

  const createLeave = useMutation({
    mutationFn: async () =>
      api.post('/rh/vacations/leaves', {
        employeeId: id,
        tipo: leaveTipo === 'Outro' ? leaveTipoOutro : leaveTipo,
        inicio: leaveInicio,
        fim: leaveRetorno || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setLeaveTipo(TIPOS_AFASTAMENTO[0]);
      setLeaveTipoOutro('');
      setLeaveInicio('');
      setLeaveRetorno('');
      setLeaveError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setLeaveError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível registrar o afastamento.');
    },
  });

  const [uploadingFracaoId, setUploadingFracaoId] = useState<string | null>(null);
  const [uploadFracaoError, setUploadFracaoError] = useState<{ fracaoId: string; message: string } | null>(null);
  const addFracaoDocumento = useMutation({
    mutationFn: async (vars: { fracaoId: string; file: File }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      form.append('tipo', 'Aviso/Recibo de férias');
      form.append('fracaoDeFeriasId', vars.fracaoId);
      return api.post(`/rh/employees/${id}/documentos`, form);
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
      setUploadingFracaoId(null);
      setUploadFracaoError(null);
    },
    onError: (err: unknown, vars) => {
      setUploadingFracaoId(null);
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadFracaoError({ fracaoId: vars.fracaoId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  const [uploadingLeaveId, setUploadingLeaveId] = useState<string | null>(null);
  const [uploadLeaveError, setUploadLeaveError] = useState<{ leaveRecordId: string; message: string } | null>(null);
  const addLeaveDocumento = useMutation({
    mutationFn: async (vars: { leaveRecordId: string; file: File }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      form.append('tipo', 'Atestado/Afastamento');
      form.append('leaveRecordId', vars.leaveRecordId);
      return api.post(`/rh/employees/${id}/documentos`, form);
    },
    onSuccess: () => {
      invalidate();
      setUploadingLeaveId(null);
      setUploadLeaveError(null);
    },
    onError: (err: unknown, vars) => {
      setUploadingLeaveId(null);
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadLeaveError({ leaveRecordId: vars.leaveRecordId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  const addDocumento = useMutation({
    mutationFn: async () => {
      if (!docFile) throw new Error('Selecione um arquivo.');
      const form = new FormData();
      form.append('arquivo', docFile);
      form.append('tipo', docTipo);
      if (docNome) form.append('nome', docNome);
      return api.post(`/rh/employees/${id}/documentos`, form);
    },
    onSuccess: () => {
      invalidate();
      setDocNome('');
      setDocTipo('');
      setDocFile(null);
    },
  });

  const removeDocumento = useMutation({
    mutationFn: async (documentoId: string) => api.delete(`/rh/employees/${id}/documentos/${documentoId}`),
    onSuccess: invalidate,
  });

  const [uploadingTerminationId, setUploadingTerminationId] = useState<string | null>(null);
  const [uploadTerminationError, setUploadTerminationError] = useState<{ terminationId: string; message: string } | null>(null);
  const addDesligamentoDocumento = useMutation({
    mutationFn: async (vars: { terminationId: string; file: File }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      form.append('tipo', 'Desligamento');
      form.append('terminationId', vars.terminationId);
      return api.post(`/rh/employees/${id}/documentos`, form);
    },
    onSuccess: () => {
      invalidate();
      setUploadingTerminationId(null);
      setUploadTerminationError(null);
    },
    onError: (err: unknown, vars) => {
      setUploadingTerminationId(null);
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadTerminationError({ terminationId: vars.terminationId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  const [ocorTipo, setOcorTipo] = useState<(typeof OCORRENCIA_TIPOS)[number]>('Advertência verbal');
  const [ocorTipoOutro, setOcorTipoOutro] = useState('');
  const [ocorData, setOcorData] = useState('');
  const [ocorDescricao, setOcorDescricao] = useState('');
  const addOcorrencia = useMutation({
    mutationFn: async () =>
      api.post(`/rh/employees/${id}/ocorrencias`, {
        tipo: ocorTipo === 'Outro' ? ocorTipoOutro || 'Outro' : ocorTipo,
        data: ocorData,
        descricao: ocorDescricao,
      }),
    onSuccess: () => {
      invalidate();
      setOcorTipo('Advertência verbal');
      setOcorTipoOutro('');
      setOcorData('');
      setOcorDescricao('');
    },
  });

  const removeOcorrencia = useMutation({
    mutationFn: async (ocorrenciaId: string) => api.delete(`/rh/employees/${id}/ocorrencias/${ocorrenciaId}`),
    onSuccess: invalidate,
  });

  const [uploadingOcorrenciaId, setUploadingOcorrenciaId] = useState<string | null>(null);
  const [uploadOcorrenciaError, setUploadOcorrenciaError] = useState<{ ocorrenciaId: string; message: string } | null>(null);
  const addOcorrenciaDocumento = useMutation({
    mutationFn: async (vars: { ocorrenciaId: string; file: File }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      return api.post(`/rh/employees/${id}/ocorrencias/${vars.ocorrenciaId}/documentos`, form);
    },
    onSuccess: () => {
      invalidate();
      setUploadingOcorrenciaId(null);
      setUploadOcorrenciaError(null);
    },
    onError: (err: unknown, vars) => {
      setUploadingOcorrenciaId(null);
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadOcorrenciaError({ ocorrenciaId: vars.ocorrenciaId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  const { data: compliance } = useQuery({
    queryKey: ['rh', 'documents', id],
    queryFn: async () =>
      (await api.get<{ compliance: number; missingFields: string[]; documentos: DocumentRequirementStatus[] }>(`/rh/documents/employees/${id}`)).data,
    enabled: tab === 'documentos',
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get<TenantInfo>('/tenant')).data,
    enabled: tab === 'registro',
  });

  const { data: feriasHistorico } = useQuery({
    queryKey: ['rh', 'ferias', 'historico', id],
    queryFn: async () => (await api.get<FeriasHistoricoColaborador>(`/rh/ferias/colaboradores/${id}/historico`)).data,
    enabled: tab === 'registro' || tab === 'ferias',
  });

  const { data: feriasSaldoAtual } = useQuery({
    queryKey: ['rh', 'ferias', 'saldo', id],
    queryFn: async () => (await api.get<{ saldoDisponivel: number; proximoVencimento: string | null; feriasVencendoEm60Dias: boolean }>(`/rh/ferias/colaboradores/${id}/saldo`)).data,
    enabled: tab === 'ferias',
  });

  const setDocStatus = useMutation({
    mutationFn: async (vars: { requirementId: string; status: DocumentRequirementStatus['status'] }) =>
      api.patch(`/rh/documents/employees/${id}/requirements/${vars.requirementId}`, { status: vars.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'documents', id] });
      invalidate();
    },
  });

  const [uploadingRequirementId, setUploadingRequirementId] = useState<string | null>(null);
  const [uploadRequirementError, setUploadRequirementError] = useState<{ requirementId: string; message: string } | null>(null);
  const uploadRequirementFile = useMutation({
    mutationFn: async (vars: { requirementId: string; file: File }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      return api.post(`/rh/documents/employees/${id}/requirements/${vars.requirementId}/upload`, form);
    },
    onSettled: () => setUploadingRequirementId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'documents', id] });
      invalidate();
      setUploadRequirementError(null);
    },
    onError: (err: unknown, vars) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadRequirementError({ requirementId: vars.requirementId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  if (!e) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/gestao-de-pessoas/colaboradores" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Colaboradores
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{e.nome}</h2>
            <Badge tone={statusColaboradorTone(e.status, e.afastadoAtual)}>{statusColaboradorLabel(e.status, e.afastadoAtual)}</Badge>
            <Badge tone={complianceTone(e.conformidadeDocumental)}>Conformidade: {e.conformidadeDocumental}%</Badge>
          </div>
          <p className="text-sm text-text-secondary">
            {e.cargo} · {e.departamento} · {e.filial ?? '—'} · gestor: {e.gestorDireto || 'Não atribuído'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setShowPromote(false);
              setEdit(toEditFields(e));
              setMotivoSalario('');
              setSalarioVigenciaDesde('');
              setEditing(true);
              setTab('geral');
            }}
          >
            Editar dados
          </Button>
          {e.status === 'ATIVO' && (
            <Button variant="danger" onClick={() => router.push(`/gestao-de-pessoas/desligamento?employeeId=${e.id}`)}>
              Desligar
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-divider">
        {TABS.filter((t) => t !== 'desligamento' || e.terminations.length > 0).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm ${tab === t ? 'border-b-2 border-accent font-medium text-text' : 'text-text-secondary'}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Tempo de casa" value={`${e.tempoDeCasa.anos}a ${e.tempoDeCasa.meses}m`} />
            <KpiCard label="Férias disponíveis" value={`${e.feriasSaldo} dias`} />
            <KpiCard label="Admissão" value={formatDate(e.dataAdmissao)} />
            <KpiCard label="Salário" value={formatBRL(Number(e.salario))} />
          </div>

          {editing && (
            <div className="flex flex-col items-end gap-2">
              {salarioAlterado && (!motivoSalario || !salarioVigenciaDesde) && (
                <p className="text-xs text-danger">Preencha o motivo e a vigência da correção do salário (em Dados contratuais) para salvar.</p>
              )}
              {saveEditError && <p className="text-xs text-danger">{saveEditError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setMotivoSalario('');
                    setSalarioVigenciaDesde('');
                    setSaveEditError('');
                  }}
                >
                  Cancelar
                </Button>
                <Button disabled={saveEdit.isPending || (salarioAlterado && (!motivoSalario || !salarioVigenciaDesde))} onClick={() => saveEdit.mutate()}>
                  {saveEdit.isPending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          )}

          {!editing || !edit ? (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                <Section title="Informações de contato" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Row label="E-mail" value={e.email ?? '—'} />
                  <Row label="Telefone" value={e.telefone ?? '—'} />
                  <Row label="Endereço" value={e.endereco ?? '—'} className="sm:col-span-2" />
                </Section>

                <Section title="Contatos de emergência">
                  <div className="flex flex-col gap-2">
                    {e.contatosEmergencia.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm text-text-secondary">
                        <span>
                          {c.nome} · {c.parentesco}
                          {c.telefone ? ` · ${c.telefone}` : ''}
                        </span>
                        <button onClick={() => removeContatoEmergencia.mutate(c.id)} className="text-xs text-danger hover:underline">
                          Remover
                        </button>
                      </div>
                    ))}
                    {e.contatosEmergencia.length === 0 && <p className="text-sm text-text-tertiary">Nenhum contato cadastrado.</p>}
                    {!showContatoForm ? (
                      <Button variant="secondary" className="self-start" onClick={() => setShowContatoForm(true)}>
                        Adicionar contato
                      </Button>
                    ) : (
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          addContatoEmergencia.mutate();
                        }}
                      >
                        <input placeholder="Nome" value={contatoNome} onChange={(ev) => setContatoNome(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                        <input placeholder="Parentesco" value={contatoParentesco} onChange={(ev) => setContatoParentesco(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                        <input placeholder="Telefone" value={contatoTelefone} onChange={(ev) => setContatoTelefone(maskPhoneBR(ev.target.value))} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                        <Button type="submit" disabled={addContatoEmergencia.isPending}>
                          Adicionar
                        </Button>
                      </form>
                    )}
                  </div>
                </Section>

                <Section title="Cônjuge e dependentes">
                  <Row label="Cônjuge" value={e.conjugeNome ? `${e.conjugeNome} · ${e.conjugeCpf ?? '—'}` : '—'} />
                  <div className="mt-2 flex flex-col gap-2">
                    {e.dependentes.map((d) => (
                      <div key={d.id} className="flex justify-between text-sm text-text-secondary">
                        <span>{d.nome}</span>
                        <span>
                          {d.parentesco} · {d.cpf ?? '—'} · {d.dataNascimento ? formatDate(d.dataNascimento) : 'data de nasc. não informada'}
                        </span>
                      </div>
                    ))}
                    {e.dependentes.length === 0 && <p className="text-sm text-text-tertiary">Nenhum dependente cadastrado.</p>}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={e.semDependentes}
                        onChange={(ev) => toggleSemDependentes.mutate(ev.target.checked)}
                      />
                      Colaborador declara não possuir dependentes/filhos
                    </label>
                    {!e.semDependentes &&
                      (!showDependenteForm ? (
                        <Button variant="secondary" className="self-start" onClick={() => setShowDependenteForm(true)}>
                          Adicionar dependente
                        </Button>
                      ) : (
                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(ev) => {
                            ev.preventDefault();
                            addDependente.mutate();
                          }}
                        >
                          <input placeholder="Nome" value={depNome} onChange={(ev) => setDepNome(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                          <input placeholder="Parentesco" value={depParentesco} onChange={(ev) => setDepParentesco(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                          <input placeholder="CPF" value={depCpf} onChange={(ev) => setDepCpf(maskCPF(ev.target.value))} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
                          <label className="flex flex-col gap-1 text-xs text-text-secondary">
                            Data de nascimento
                            <input
                              type="date"
                              value={depDataNascimento}
                              onChange={(ev) => setDepDataNascimento(ev.target.value)}
                              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
                            />
                          </label>
                          <Button type="submit" disabled={addDependente.isPending}>
                            Adicionar
                          </Button>
                        </form>
                      ))}
                  </div>
                </Section>
              </div>

              <Section title="Dados pessoais" className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Row label="Data de nascimento" value={e.dataNascimento ? formatDate(e.dataNascimento) : '—'} />
                <Row label="Escolaridade" value={e.escolaridade ?? '—'} />
                <Row label="Estado civil" value={e.estadoCivil ?? '—'} />
                <Row label="Nacionalidade" value={e.nacionalidade ?? '—'} />
                <Row label="Nome da mãe" value={e.nomeMae ?? '—'} />
                <Row label="Nome do pai" value={e.nomePai ?? '—'} />
                <Row label="Gênero" value={e.genero ?? '—'} />
                <Row label="CNH" value={e.cnh ?? '—'} />
                <Row label="Categoria da CNH" value={e.cnhCategoria ?? '—'} />
                <Row label="Validade da CNH" value={e.cnhValidade ? formatDate(e.cnhValidade) : '—'} />
                <Row label="RG" value={e.rg ?? '—'} />
                <Row label="Órgão expedidor do RG" value={e.rgOrgaoExpedidor ?? '—'} />
                <Row label="Data de expedição do RG" value={e.rgDataExpedicao ? formatDate(e.rgDataExpedicao) : '—'} />
                <Row label="Título de eleitor" value={e.tituloEleitor ?? '—'} />
                <Row label="Zona eleitoral" value={e.tituloEleitorZona ?? '—'} />
                <Row label="Seção eleitoral" value={e.tituloEleitorSecao ?? '—'} />
                <Row label="PIS" value={e.pis ?? '—'} />
                <Row label="CTPS" value={e.ctps ?? '—'} />
                <Row label="CPF" value={e.cpf ?? '—'} />
                <Row label="Raça/cor" value={e.racaCor ?? '—'} />
                <Row label="PcD" value={e.pcd ? 'Sim' : 'Não'} />
              </Section>

              <Section title="Dados contratuais" className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Row label="Cargo" value={e.cargo} />
                <Row label="Departamento" value={e.departamento} />
                <Row label="Filial" value={e.filial ?? '—'} />
                <Row label="Gestor direto" value={e.gestorDireto ?? 'Não atribuído'} />
                <Row label="Tipo de contrato" value={TIPO_CONTRATO_LABEL[e.tipoContrato]} />
                <Row label="Tipo de salário" value={TIPO_SALARIO_LABEL[e.tipoSalario]} />
                <Row label="Matrícula" value={e.matricula} />
              </Section>

              <Section title="Dados bancários" className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Row label="Banco" value={e.banco ?? '—'} />
                <Row label="Agência" value={e.agencia ?? '—'} />
                <Row label="Conta" value={e.conta ?? '—'} />
                <Row label="Tipo de conta" value={e.tipoConta ? TIPO_CONTA_LABEL[e.tipoConta] : '—'} />
                <Row label="Chave PIX" value={e.chavePix ?? '—'} />
              </Section>
            </>
          ) : (
            <form
              className="flex flex-col gap-6"
              onSubmit={(ev) => {
                ev.preventDefault();
                saveEdit.mutate();
              }}
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Informações de contato">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="E-mail" value={edit.email} onChange={(v) => setEdit({ ...edit, email: v })} />
                    <EditField label="Telefone" value={edit.telefone} onChange={(v) => setEdit({ ...edit, telefone: maskPhoneBR(v) })} />
                    <EditField label="Endereço" value={edit.endereco} onChange={(v) => setEdit({ ...edit, endereco: v })} className="col-span-2" />
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">
                    Contatos de emergência agora são gerenciados na Visão geral, fora do modo de edição.
                  </p>
                </Section>

                <Section title="Cônjuge">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Nome" value={edit.conjugeNome} onChange={(v) => setEdit({ ...edit, conjugeNome: v })} />
                    <EditField label="CPF" value={edit.conjugeCpf} onChange={(v) => setEdit({ ...edit, conjugeCpf: maskCPF(v) })} />
                  </div>
                </Section>
              </div>

              <Section title="Dados pessoais">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Data de nascimento" type="date" value={edit.dataNascimento} onChange={(v) => setEdit({ ...edit, dataNascimento: v })} />
                  <SelectField label="Escolaridade" value={edit.escolaridade} onChange={(v) => setEdit({ ...edit, escolaridade: v })} options={ESCOLARIDADE_OPTIONS} />
                  <SelectField label="Estado civil" value={edit.estadoCivil} onChange={(v) => setEdit({ ...edit, estadoCivil: v })} options={ESTADO_CIVIL_OPTIONS} />
                  <EditField label="Nacionalidade" value={edit.nacionalidade} onChange={(v) => setEdit({ ...edit, nacionalidade: v })} />
                  <EditField label="Nome da mãe" value={edit.nomeMae} onChange={(v) => setEdit({ ...edit, nomeMae: v })} />
                  <EditField label="Nome do pai" value={edit.nomePai} onChange={(v) => setEdit({ ...edit, nomePai: v })} />
                  <SelectField label="Gênero" value={edit.genero} onChange={(v) => setEdit({ ...edit, genero: v })} options={GENERO_OPTIONS} />
                  <EditField label="CNH" value={edit.cnh} onChange={(v) => setEdit({ ...edit, cnh: v })} />
                  <SelectField label="Categoria da CNH" value={edit.cnhCategoria} onChange={(v) => setEdit({ ...edit, cnhCategoria: v })} options={CNH_CATEGORIA_OPTIONS} />
                  <EditField label="Validade da CNH" type="date" value={edit.cnhValidade} onChange={(v) => setEdit({ ...edit, cnhValidade: v })} />
                  <EditField label="RG" value={edit.rg} onChange={(v) => setEdit({ ...edit, rg: v })} />
                  <EditField label="Órgão expedidor do RG" value={edit.rgOrgaoExpedidor} onChange={(v) => setEdit({ ...edit, rgOrgaoExpedidor: v })} placeholder="SSP/SP" />
                  <EditField label="Data de expedição do RG" type="date" value={edit.rgDataExpedicao} onChange={(v) => setEdit({ ...edit, rgDataExpedicao: v })} />
                  <EditField label="Título de eleitor" value={edit.tituloEleitor} onChange={(v) => setEdit({ ...edit, tituloEleitor: v })} />
                  <EditField label="Zona eleitoral" value={edit.tituloEleitorZona} onChange={(v) => setEdit({ ...edit, tituloEleitorZona: v })} />
                  <EditField label="Seção eleitoral" value={edit.tituloEleitorSecao} onChange={(v) => setEdit({ ...edit, tituloEleitorSecao: v })} />
                  <EditField label="PIS" value={edit.pis} onChange={(v) => setEdit({ ...edit, pis: v })} />
                  <EditField label="CTPS" value={edit.ctps} onChange={(v) => setEdit({ ...edit, ctps: v })} />
                  <EditField label="CPF" value={edit.cpf} onChange={(v) => setEdit({ ...edit, cpf: maskCPF(v) })} />
                  <SelectField label="Raça/cor" value={edit.racaCor} onChange={(v) => setEdit({ ...edit, racaCor: v })} options={RACA_COR_OPTIONS} />
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input type="checkbox" checked={edit.pcd} onChange={(ev) => setEdit({ ...edit, pcd: ev.target.checked })} />
                    Pessoa com deficiência (PcD)
                  </label>
                </div>
              </Section>

              <Section title="Dados contratuais">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Matrícula" value={edit.matricula} onChange={(v) => setEdit({ ...edit, matricula: v })} />
                  <EditField label="Data de admissão" type="date" value={edit.dataAdmissao} onChange={(v) => setEdit({ ...edit, dataAdmissao: v })} />
                  <EditField label="Cargo" value={edit.cargo} onChange={(v) => setEdit({ ...edit, cargo: v })} />
                  <EditField label="Departamento" value={edit.departamento} onChange={(v) => setEdit({ ...edit, departamento: v })} />
                  <EditField label="Filial" value={edit.filial} onChange={(v) => setEdit({ ...edit, filial: v })} />
                  <EditField label="Salário" type="number" step="0.01" value={edit.salario} onChange={(v) => setEdit({ ...edit, salario: v })} />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">Tipo de contrato</span>
                    <select
                      value={edit.tipoContrato}
                      onChange={(ev) => setEdit({ ...edit, tipoContrato: ev.target.value as EditFields['tipoContrato'] })}
                      className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
                    >
                      <option value="CLT">CLT</option>
                      <option value="ESTAGIO">Estágio</option>
                      <option value="PJ">PJ</option>
                      <option value="INTERMITENTE">Intermitente</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">Tipo de salário</span>
                    <select
                      value={edit.tipoSalario}
                      onChange={(ev) => setEdit({ ...edit, tipoSalario: ev.target.value as EditFields['tipoSalario'] })}
                      className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
                    >
                      <option value="MENSALISTA">Mensalista</option>
                      <option value="HORISTA">Horista</option>
                      <option value="DIARISTA">Diarista</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">Gestor direto</span>
                    <select
                      value={edit.gestorDireto}
                      onChange={(ev) => setEdit({ ...edit, gestorDireto: ev.target.value })}
                      className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
                    >
                      <option value="">Não atribuído</option>
                      {edit.gestorDireto && !managers?.some((m) => m.nome === edit.gestorDireto) && (
                        <option value={edit.gestorDireto}>{edit.gestorDireto}</option>
                      )}
                      {managers?.map((m) => (
                        <option key={m.id} value={m.nome}>
                          {m.nome} · {m.cargo} ({m.tipoContrato})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {salarioAlterado && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <label className="flex flex-1 flex-col gap-1.5 text-sm">
                      <span className="text-text-secondary">Motivo da correção do salário (obrigatório)</span>
                      <input
                        value={motivoSalario}
                        onChange={(ev) => setMotivoSalario(ev.target.value)}
                        placeholder="Ex.: erro de digitação no cadastro inicial"
                        required
                        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="text-text-secondary">Vigente desde (obrigatório)</span>
                      <input
                        type="date"
                        value={salarioVigenciaDesde}
                        onChange={(ev) => setSalarioVigenciaDesde(ev.target.value)}
                        required
                        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                      />
                    </label>
                    <span className="w-full text-xs text-text-tertiary">
                      Para reajustes anuais, promoções ou dissídios, use o botão &quot;Alterar salário&quot; em vez de editar aqui.
                    </span>
                  </div>
                )}
              </Section>

              <Section title="Dados bancários">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Banco" value={edit.banco} onChange={(v) => setEdit({ ...edit, banco: v })} />
                  <EditField label="Agência" value={edit.agencia} onChange={(v) => setEdit({ ...edit, agencia: v })} />
                  <EditField label="Conta" value={edit.conta} onChange={(v) => setEdit({ ...edit, conta: v })} />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">Tipo de conta</span>
                    <select
                      value={edit.tipoConta}
                      onChange={(ev) => setEdit({ ...edit, tipoConta: ev.target.value as EditFields['tipoConta'] })}
                      className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
                    >
                      <option value="CORRENTE">Conta corrente</option>
                      <option value="POUPANCA">Conta poupança</option>
                    </select>
                  </label>
                  <EditField label="Chave PIX" value={edit.chavePix} onChange={(v) => setEdit({ ...edit, chavePix: v })} />
                </div>
              </Section>
            </form>
          )}
        </div>
      )}

      {tab === 'cargoSalario' && (
        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Cargo e salário atuais</h3>
                <p className="text-sm text-text-secondary">
                  {e.cargo} · {formatBRL(Number(e.salario))}
                </p>
              </div>
              {e.status === 'ATIVO' && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (showPromote && promoteMode === 'salario') {
                        setShowPromote(false);
                        return;
                      }
                      setPromoteMode('salario');
                      setNovoSalario('');
                      setNovoCargo('');
                      setShowPromote(true);
                    }}
                  >
                    Alterar salário
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (showPromote && promoteMode === 'cargo') {
                        setShowPromote(false);
                        return;
                      }
                      setPromoteMode('cargo');
                      setNovoCargo('');
                      setNovoSalario(String(e.salario));
                      setShowPromote(true);
                    }}
                  >
                    Alterar cargo
                  </Button>
                </div>
              )}
            </div>

            {showPromote && (
              <form
                className="flex flex-wrap items-end gap-3 border-t border-divider pt-4"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  promote.mutate();
                }}
              >
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Motivo</span>
                  <select
                    value={motivoPromocao}
                    onChange={(ev) => setMotivoPromocao(ev.target.value as typeof motivoPromocao)}
                    className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  >
                    <option value="Promoção">Promoção</option>
                    <option value="Reajuste anual">Reajuste anual</option>
                    <option value="Dissídio coletivo">Dissídio coletivo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">{promoteMode === 'cargo' ? 'Novo cargo' : 'Novo cargo (se houver)'}</span>
                  <input
                    value={novoCargo}
                    onChange={(ev) => setNovoCargo(ev.target.value)}
                    placeholder={e.cargo}
                    required={promoteMode === 'cargo'}
                    className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">{promoteMode === 'cargo' ? 'Salário (mantido)' : 'Novo salário'}</span>
                  <input type="number" min={0} step="0.01" value={novoSalario} onChange={(ev) => setNovoSalario(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Vigente desde</span>
                  <input
                    type="date"
                    value={vigenciaPromocao}
                    onChange={(ev) => setVigenciaPromocao(ev.target.value)}
                    required
                    className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
                <Button type="submit" disabled={promote.isPending}>
                  Confirmar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowPromote(false)}>
                  Cancelar
                </Button>
              </form>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold">Histórico de cargo e salário</h3>
            {e.cargoSalarioHistorico.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
            <ul className="flex flex-col gap-2">
              {e.cargoSalarioHistorico.map((h) => (
                <li key={h.id} className="rounded-[10px] border border-border p-2.5">
                  {editingHistoricoId === h.id ? (
                    <form
                      className="flex flex-wrap items-end gap-3"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        updateHistorico.mutate(h.id);
                      }}
                    >
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-text-secondary">Vigente desde</span>
                        <input
                          type="date"
                          value={historicoVigencia}
                          onChange={(ev) => setHistoricoVigencia(ev.target.value)}
                          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-text-secondary">Cargo</span>
                        <input
                          value={historicoCargo}
                          onChange={(ev) => setHistoricoCargo(ev.target.value)}
                          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-text-secondary">Salário</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={historicoSalario}
                          onChange={(ev) => setHistoricoSalario(ev.target.value)}
                          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                        />
                      </label>
                      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm">
                        <span className="text-text-secondary">Justificativa da correção</span>
                        <input
                          value={historicoMotivoCorrecao}
                          onChange={(ev) => setHistoricoMotivoCorrecao(ev.target.value)}
                          placeholder="Por que este registro está sendo corrigido?"
                          required
                          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                        />
                      </label>
                      <Button type="submit" disabled={updateHistorico.isPending}>
                        Salvar correção
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingHistoricoId(null)}>
                        Cancelar
                      </Button>
                    </form>
                  ) : deletingHistoricoId === h.id ? (
                    <form
                      className="flex flex-wrap items-end gap-3"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        removeHistorico.mutate(h.id);
                      }}
                    >
                      <p className="text-sm text-danger">
                        Remover o registro de {formatDate(h.vigenciaDesde)} ({h.cargo} · {formatBRL(Number(h.salario))})?
                      </p>
                      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-sm">
                        <span className="text-text-secondary">Justificativa da exclusão</span>
                        <input
                          value={historicoMotivoExclusao}
                          onChange={(ev) => setHistoricoMotivoExclusao(ev.target.value)}
                          placeholder="Por que este registro está sendo removido?"
                          required
                          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                        />
                      </label>
                      <Button type="submit" variant="danger" disabled={removeHistorico.isPending}>
                        Confirmar exclusão
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setDeletingHistoricoId(null)}>
                        Cancelar
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div>
                          {formatDate(h.vigenciaDesde)} · {h.cargo} · {formatBRL(Number(h.salario))}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {h.motivo}
                          {h.observacao ? ` — ${h.observacao}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-xs text-accent hover:underline"
                          onClick={() => {
                            setDeletingHistoricoId(null);
                            setEditingHistoricoId(h.id);
                            setHistoricoVigencia(h.vigenciaDesde.slice(0, 10));
                            setHistoricoCargo(h.cargo);
                            setHistoricoSalario(String(h.salario));
                            setHistoricoMotivoCorrecao('');
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs text-danger hover:underline"
                          onClick={() => {
                            setEditingHistoricoId(null);
                            setDeletingHistoricoId(h.id);
                            setHistoricoMotivoExclusao('');
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'ferias' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Saldo disponível" value={feriasSaldoAtual ? `${feriasSaldoAtual.saldoDisponivel} dias` : '—'} />
            <KpiCard
              label="Próximo vencimento"
              value={
                <span className={feriasSaldoAtual?.feriasVencendoEm60Dias ? 'text-danger' : ''}>
                  {feriasSaldoAtual?.proximoVencimento ? formatDate(feriasSaldoAtual.proximoVencimento) : '—'}
                </span>
              }
            />
            <KpiCard label="Períodos aquisitivos" value={feriasHistorico?.periodos.length ?? 0} />
          </div>

          <Section title="Períodos aquisitivos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-divider text-left text-text-tertiary">
                    <th className="py-2 pr-3 font-medium">Período</th>
                    <th className="py-2 pr-3 font-medium">Situação</th>
                    <th className="py-2 pr-3 font-medium">Adquiridos</th>
                    <th className="py-2 pr-3 font-medium">Gozados</th>
                    <th className="py-2 pr-3 font-medium">Vendidos</th>
                    <th className="py-2 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(feriasHistorico?.periodos ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-divider last:border-0">
                      <td className="py-2 pr-3">
                        {formatDate(p.dataInicio)} a {formatDate(p.dataFim)}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={STATUS_PERIODO_TONE[p.resumo.status]}>{STATUS_PERIODO_LABEL[p.resumo.status]}</Badge>
                      </td>
                      <td className="py-2 pr-3">{p.resumo.diasAdquiridos}</td>
                      <td className="py-2 pr-3">{p.resumo.diasGozados}</td>
                      <td className="py-2 pr-3">{p.resumo.diasVendidos}</td>
                      <td className="py-2 font-medium">{p.resumo.saldoDisponivel}</td>
                    </tr>
                  ))}
                  {(feriasHistorico?.periodos ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState>Sem períodos aquisitivos.</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Programar férias">
              <form
                className="flex flex-col items-start gap-3"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  programarFerias.mutate();
                }}
              >
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Período aquisitivo</span>
                  <select
                    value={progPeriodoId}
                    onChange={(ev) => setProgPeriodoId(ev.target.value)}
                    required
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  >
                    <option value="">Selecione…</option>
                    {(feriasHistorico?.periodos ?? [])
                      .filter((p) => p.resumo.saldoDisponivel > 0)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatDate(p.dataInicio)} a {formatDate(p.dataFim)} — saldo {p.resumo.saldoDisponivel}d
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Início</span>
                  <input type="date" value={progInicio} onChange={(ev) => setProgInicio(ev.target.value)} required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Dias de gozo</span>
                  <input
                    type="number"
                    min={1}
                    value={progDias}
                    onChange={(ev) => setProgDias(ev.target.value)}
                    required
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Dias de abono pecuniário (venda de férias, opcional, máx. 10)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={progDiasAbono}
                    onChange={(ev) => setProgDiasAbono(ev.target.value)}
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={progAntecipa13} onChange={(ev) => setProgAntecipa13(ev.target.checked)} />
                  <span className="text-text-secondary">Antecipar 1ª parcela do 13º salário</span>
                </label>
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Justificativa (obrigatória se fora da janela de 30 dias de aviso)</span>
                  <input
                    value={progJustificativa}
                    onChange={(ev) => setProgJustificativa(ev.target.value)}
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
                <Button type="submit" disabled={programarFerias.isPending}>
                  Programar
                </Button>
                {programarError && <p className="text-xs text-danger">{programarError}</p>}
              </form>
            </Section>

            <Section title="Frações programadas">
              {(feriasHistorico?.periodos ?? []).every((p) => p.fracoes.length === 0) && <p className="text-sm text-text-tertiary">Sem registros.</p>}
              <ul className="flex flex-col gap-2 text-sm">
                {(feriasHistorico?.periodos ?? [])
                  .flatMap((p) => p.fracoes.map((f) => ({ ...f, periodoNumero: p.numero })))
                  .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
                  .map((f) => (
                    <li key={f.id} className="flex flex-col gap-1.5 rounded-[10px] border border-border p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-text-secondary">
                          {formatDate(f.dataInicio)} a {formatDate(f.dataFim)} ({f.dias}d{f.diasAbono > 0 ? ` · ${f.diasAbono}d de abono` : ''}
                          {f.antecipa13 ? ' · antecipa 13º' : ''})
                        </span>
                        <Badge tone={STATUS_FRACAO_TONE[f.statusEfetivo]}>{STATUS_FRACAO_LABEL[f.statusEfetivo]}</Badge>
                      </div>
                      {f.justificativa && <p className="text-xs text-text-tertiary">{f.justificativa}</p>}
                      <div className="flex flex-wrap items-center gap-3">
                        {f.documentos.map((d) => (
                          <a
                            key={d.id}
                            href={`${apiBaseUrl}/rh/employees/${id}/documentos/${d.id}/arquivo`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            {d.nome}
                          </a>
                        ))}
                        <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                          {uploadingFracaoId === f.id ? 'Enviando…' : 'Anexar aviso/recibo'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="hidden"
                            disabled={uploadingFracaoId === f.id}
                            onChange={(ev) => {
                              const file = ev.target.files?.[0];
                              if (file) {
                                setUploadingFracaoId(f.id);
                                addFracaoDocumento.mutate({ fracaoId: f.id, file });
                              }
                              ev.target.value = '';
                            }}
                          />
                        </label>
                        {f.status === 'PENDENTE' && (
                          <>
                            <Button onClick={() => aprovarFracao.mutate(f.id)}>Aprovar</Button>
                            <Button variant="secondary" onClick={() => reprovarFracao.mutate(f.id)}>
                              Reprovar
                            </Button>
                          </>
                        )}
                        {(f.status === 'PENDENTE' || f.status === 'APROVADA') && (
                          <Button variant="secondary" onClick={() => cancelarFracao.mutate(f.id)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                      {uploadFracaoError?.fracaoId === f.id && <p className="text-xs text-danger">{uploadFracaoError.message}</p>}
                    </li>
                  ))}
              </ul>
            </Section>
          </div>
        </div>
      )}

      {tab === 'afastamentos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Section title="Registrar afastamento">
            <form
              className="flex flex-col items-start gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                createLeave.mutate();
              }}
            >
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Tipo</span>
                <select
                  value={leaveTipo}
                  onChange={(ev) => setLeaveTipo(ev.target.value)}
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                >
                  {TIPOS_AFASTAMENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {leaveTipo === 'Outro' && (
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Descreva o tipo</span>
                  <input
                    value={leaveTipoOutro}
                    onChange={(ev) => setLeaveTipoOutro(ev.target.value)}
                    required
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
              )}
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Início</span>
                <input
                  type="date"
                  value={leaveInicio}
                  onChange={(ev) => setLeaveInicio(ev.target.value)}
                  required
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Retorno (opcional — deixe em branco se ainda em andamento)</span>
                <input
                  type="date"
                  value={leaveRetorno}
                  onChange={(ev) => setLeaveRetorno(ev.target.value)}
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
              <Button type="submit" disabled={createLeave.isPending}>
                Registrar afastamento
              </Button>
              {leaveError && <p className="text-xs text-danger">{leaveError}</p>}
            </form>
          </Section>

          <Section title="Afastamentos registrados" cardClassName="lg:col-span-2">
            {e.leaveRecords.length === 0 && <p className="text-sm text-text-tertiary">Nenhum afastamento registrado.</p>}
            <ul className="flex flex-col gap-2 text-sm">
              {e.leaveRecords.map((l) => {
                const docs = e.documentos.filter((d) => d.leaveRecordId === l.id);
                return (
                  <li key={l.id} className="flex flex-col gap-1.5 rounded-[10px] border border-border p-2.5">
                    <span className="text-text-secondary">
                      {l.tipo} — {formatDate(l.inicio)} {l.retorno ? `a ${formatDate(l.retorno)}` : '(em andamento)'}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {docs.map((d) => (
                        <a
                          key={d.id}
                          href={`${apiBaseUrl}/rh/employees/${id}/documentos/${d.id}/arquivo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          {d.nome}
                        </a>
                      ))}
                      <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                        {uploadingLeaveId === l.id ? 'Enviando…' : 'Anexar atestado'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          disabled={uploadingLeaveId === l.id}
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) {
                              setUploadingLeaveId(l.id);
                              addLeaveDocumento.mutate({ leaveRecordId: l.id, file });
                            }
                            ev.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {uploadLeaveError?.leaveRecordId === l.id && <p className="text-xs text-danger">{uploadLeaveError.message}</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>
      )}

      {tab === 'beneficios' && <BeneficiosTab employeeId={e.id} dataNascimento={e.dataNascimento} />}

      {tab === 'avaliacoes' && (
        <Card className="max-w-2xl">
          {e.evaluationRecords.length === 0 && <p className="text-sm text-text-tertiary">Sem avaliações.</p>}
          <ul className="flex flex-col gap-2 text-sm">
            {e.evaluationRecords.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.cycle.nome}</span>
                <span className="font-medium">{r.gestorNota ?? r.autoNota ?? '—'}/5</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'documentos' && (
        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Conformidade documental</h3>
              <Badge tone={complianceTone(compliance?.compliance ?? 0)}>
                {compliance?.compliance ?? 0}%
              </Badge>
            </div>
            {!!compliance?.missingFields.length && (
              <div className="mb-3 rounded-[10px] border border-danger/30 bg-danger/5 p-3">
                <p className="mb-1 text-xs font-semibold text-danger">Informações cadastrais obrigatórias pendentes:</p>
                <p className="text-xs text-text-secondary">{compliance.missingFields.join(', ')}</p>
              </div>
            )}
            {compliance && compliance.documentos.length === 0 && (
              <p className="text-sm text-text-tertiary">Nenhum documento obrigatório se aplica a este colaborador.</p>
            )}
            <ul className="flex flex-col gap-2">
              {compliance?.documentos.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border p-2.5 text-sm">
                  <div>
                    <div className="font-medium">
                      {d.requirement.nome}
                      {d.requirement.sistema && <span className="text-xs text-text-tertiary"> · exigido pela CLT</span>}
                      {!d.requirement.obrigatorio && <span className="text-xs text-text-tertiary"> (opcional)</span>}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {d.requirement.categoria}
                      {d.expiraEm && ` · vence em ${formatDate(d.expiraEm)}`}
                      {d.arquivoNome && ` · anexo: ${d.arquivoNome}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={DOC_STATUS_TONE[d.status]}>{DOC_STATUS_LABEL[d.status]}</Badge>
                    <select
                      value={d.status}
                      onChange={(ev) => setDocStatus.mutate({ requirementId: d.requirementId, status: ev.target.value as DocumentRequirementStatus['status'] })}
                      className="rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs"
                    >
                      <option value="MISSING">Faltante</option>
                      <option value="PENDING">Em análise</option>
                      <option value="COMPLIANT">Conforme</option>
                      <option value="REJECTED">Não conforme</option>
                      <option value="NAO_SE_APLICA">Não se aplica</option>
                    </select>
                    {d.arquivoNome && (
                      <a
                        href={`${apiBaseUrl}/rh/documents/employees/${id}/requirements/${d.requirementId}/arquivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent"
                      >
                        Visualizar
                      </a>
                    )}
                    <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                      {uploadingRequirementId === d.requirementId ? 'Enviando…' : 'Anexar'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        disabled={uploadingRequirementId === d.requirementId}
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (file) {
                            setUploadingRequirementId(d.requirementId);
                            uploadRequirementFile.mutate({ requirementId: d.requirementId, file });
                          }
                          ev.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {uploadRequirementError?.requirementId === d.requirementId && (
                    <p className="w-full text-xs text-danger">{uploadRequirementError.message}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            {e.documentos.length === 0 && <p className="text-sm text-text-tertiary">Sem documentos.</p>}
            <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {e.documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-[10px] border border-border p-3">
                  <div>
                    <div className="font-medium">{d.nome}</div>
                    <div className="text-xs text-text-tertiary">
                      {d.tipo} · {d.tamanho} · {formatDate(d.uploadEm)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${apiBaseUrl}/rh/employees/${id}/documentos/${d.id}/arquivo`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Visualizar
                    </a>
                    <button onClick={() => removeDocumento.mutate(d.id)} className="text-xs text-danger hover:underline">
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <form
              className="flex flex-col items-start gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                addDocumento.mutate();
              }}
            >
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Arquivo</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(ev) => setDocFile(ev.target.files?.[0] ?? null)}
                  required
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Nome (opcional, padrão é o nome do arquivo)</span>
                <input value={docNome} onChange={(ev) => setDocNome(ev.target.value)} className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Tipo</span>
                <input value={docTipo} onChange={(ev) => setDocTipo(ev.target.value)} placeholder="Contrato, Documento pessoal…" required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <Button type="submit" disabled={addDocumento.isPending || !docFile}>
                {addDocumento.isPending ? 'Enviando…' : 'Anexar arquivo'}
              </Button>
            </form>
          </Card>
          </div>
        </div>
      )}

      {tab === 'ocorrencias' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            {e.ocorrencias.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma ocorrência registrada.</p>}
            <ul className="flex flex-col gap-3">
              {e.ocorrencias.map((o) => {
                const docs = e.documentos.filter((d) => d.ocorrenciaId === o.id);
                return (
                  <li key={o.id} className="flex flex-col gap-2 rounded-[10px] border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{o.tipo}</div>
                        <div className="text-xs text-text-tertiary">
                          {formatDate(o.data)} · {o.autor}
                        </div>
                      </div>
                      <button onClick={() => removeOcorrencia.mutate(o.id)} className="text-xs text-danger hover:underline">
                        Remover
                      </button>
                    </div>
                    <p className="text-text-secondary">{o.descricao}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {docs.map((d) => (
                        <a
                          key={d.id}
                          href={`${apiBaseUrl}/rh/employees/${id}/documentos/${d.id}/arquivo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          {d.nome}
                        </a>
                      ))}
                      <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                        {uploadingOcorrenciaId === o.id ? 'Enviando…' : 'Anexar arquivo'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          disabled={uploadingOcorrenciaId === o.id}
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) {
                              setUploadingOcorrenciaId(o.id);
                              addOcorrenciaDocumento.mutate({ ocorrenciaId: o.id, file });
                            }
                            ev.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {uploadOcorrenciaError?.ocorrenciaId === o.id && <p className="text-xs text-danger">{uploadOcorrenciaError.message}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <form
              className="flex flex-col items-start gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                addOcorrencia.mutate();
              }}
            >
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Tipo</span>
                <select
                  value={ocorTipo}
                  onChange={(ev) => setOcorTipo(ev.target.value as (typeof OCORRENCIA_TIPOS)[number])}
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                >
                  {OCORRENCIA_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {ocorTipo === 'Outro' && (
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Descreva o tipo</span>
                  <input
                    value={ocorTipoOutro}
                    onChange={(ev) => setOcorTipoOutro(ev.target.value)}
                    required
                    className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
              )}
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Data</span>
                <input
                  type="date"
                  value={ocorData}
                  onChange={(ev) => setOcorData(ev.target.value)}
                  required
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Descrição</span>
                <textarea
                  value={ocorDescricao}
                  onChange={(ev) => setOcorDescricao(ev.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
              <Button type="submit" disabled={addOcorrencia.isPending}>
                Registrar ocorrência
              </Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'historico' && (
        <Card className="max-w-2xl">
          {e.historico.length === 0 && <p className="text-sm text-text-tertiary">Sem eventos.</p>}
          <ul className="flex flex-col gap-2 text-sm">
            {e.historico.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span>{h.evento}</span>
                  <span className="text-xs text-text-tertiary">
                    {h.categoria} · {formatDate(h.data)} · {h.autor}
                  </span>
                </div>
                {h.revertivel && (
                  <button
                    type="button"
                    disabled={revertHistorico.isPending && revertingHistoricoId === h.id}
                    onClick={() => revertHistorico.mutate(h.id)}
                    className="shrink-0 text-xs font-medium text-accent hover:underline disabled:opacity-60"
                  >
                    {revertHistorico.isPending && revertingHistoricoId === h.id ? 'Revertendo…' : 'Reverter'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'desligamento' && (
        <div className="flex flex-col gap-6">
          {e.terminations.length === 0 && <EmptyState>Sem processo de desligamento registrado.</EmptyState>}
          {e.terminations.map((t) => {
            const docs = e.documentos.filter((d) => d.terminationId === t.id);
            return (
              <Card key={t.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{TERMINATION_TIPO_LABEL[t.tipo]}</h3>
                    <p className="text-xs text-text-tertiary">
                      {formatDate(t.data)}
                      {t.motivo ? ` · ${t.motivo}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={TERMINATION_STATUS_TONE[t.status]}>{TERMINATION_STATUS_LABEL[t.status]}</Badge>
                    <Link href={`/gestao-de-pessoas/desligamento/${t.id}`} className="text-xs text-accent hover:underline">
                      Ver processo completo →
                    </Link>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Documentos do desligamento</h4>
                    <label className="cursor-pointer rounded-[10px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                      {uploadingTerminationId === t.id ? 'Enviando…' : 'Anexar documento'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        disabled={uploadingTerminationId === t.id}
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (file) {
                            setUploadingTerminationId(t.id);
                            addDesligamentoDocumento.mutate({ terminationId: t.id, file });
                          }
                          ev.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {uploadTerminationError?.terminationId === t.id && <p className="mb-2 text-xs text-danger">{uploadTerminationError.message}</p>}
                  {docs.length === 0 ? (
                    <p className="text-sm text-text-tertiary">Nenhum documento anexado ainda.</p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between rounded-[10px] border border-border p-2.5 text-sm">
                          <div>
                            <div className="font-medium">{d.nome}</div>
                            <div className="text-xs text-text-tertiary">
                              {d.tamanho} · {formatDate(d.uploadEm)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <a
                              href={`${apiBaseUrl}/rh/employees/${id}/documentos/${d.id}/arquivo`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline"
                            >
                              Visualizar
                            </a>
                            <button onClick={() => removeDocumento.mutate(d.id)} className="text-xs text-danger hover:underline">
                              Remover
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'registro' && (
        <div className="flex flex-col gap-6">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #registro-empregado-print, #registro-empregado-print * { visibility: visible; }
              #registro-empregado-print { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}</style>

          <div className="flex justify-end print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir / Gerar PDF
            </Button>
          </div>

          <div id="registro-empregado-print" className="flex flex-col gap-4">
            <div className="text-center">
              <h3 className="text-lg font-bold tracking-wide">REGISTRO DE EMPREGADO</h3>
              <p className="text-xs text-text-tertiary">Matrícula {e.matricula}</p>
            </div>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Empregador</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
                <FormBox label="Razão social" value={tenant?.razaoSocial ?? tenant?.name} className="sm:col-span-2" />
                <FormBox label="CNPJ" value={tenant?.cnpj} />
                <FormBox label="Endereço" value={tenant ? enderecoTenant(tenant) : '—'} className="sm:col-span-3" />
              </div>
            </Card>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Empregado</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
                <FormBox label="Nome" value={e.nome} className="sm:col-span-2" />
                <FormBox label="Data de nascimento" value={e.dataNascimento ? formatDate(e.dataNascimento) : null} />
                <FormBox label="Residência" value={e.endereco} className="sm:col-span-3" />
                <FormBox label="Nacionalidade" value={e.nacionalidade} />
                <FormBox label="Estado civil" value={e.estadoCivil} />
                <FormBox label="Sexo" value={e.genero} />
                <FormBox label="Nome do pai" value={e.nomePai} className="sm:col-span-2" />
                <FormBox label="Nome da mãe" value={e.nomeMae} />
              </div>
            </Card>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Documentos</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
                <FormBox label="CPF" value={e.cpf} />
                <FormBox label="RG" value={e.rg} />
                <FormBox label="Órgão/data expedição" value={e.rgOrgaoExpedidor ? `${e.rgOrgaoExpedidor}${e.rgDataExpedicao ? ' · ' + formatDate(e.rgDataExpedicao) : ''}` : null} />
                <FormBox label="CTPS" value={e.ctps} />
                <FormBox label="PIS" value={e.pis} />
                <FormBox label="Título eleitoral" value={e.tituloEleitor ? `${e.tituloEleitor}${e.tituloEleitorZona ? ' · zona ' + e.tituloEleitorZona : ''}${e.tituloEleitorSecao ? ' · seção ' + e.tituloEleitorSecao : ''}` : null} />
                <FormBox label="CNH" value={e.cnh ? `${e.cnh}${e.cnhCategoria ? ' · cat. ' + e.cnhCategoria : ''}` : null} />
                <FormBox label="Grau de instrução" value={e.escolaridade} />
                <FormBox label="Raça/cor" value={e.racaCor} />
                <FormBox label="Deficiência (PcD)" value={e.pcd ? 'Sim' : 'Não'} />
                <FormBox label="Telefone" value={e.telefone} />
                <FormBox label="E-mail" value={e.email} />
              </div>
            </Card>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Cargo, admissão e remuneração</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
                <FormBox label="Cargo" value={e.cargo} />
                <FormBox label="Departamento" value={e.departamento} />
                <FormBox label="Data de admissão" value={formatDate(e.dataAdmissao)} />
                <FormBox label="Tipo de contrato" value={TIPO_CONTRATO_LABEL[e.tipoContrato]} />
                <FormBox label="Salário" value={`${formatBRL(Number(e.salario))} (${TIPO_SALARIO_LABEL[e.tipoSalario]})`} />
                <FormBox label="Status" value={statusColaboradorLabel(e.status, e.afastadoAtual)} />
                <FormBox label="Banco" value={e.banco ? `${e.banco}${e.agencia ? ' · ag. ' + e.agencia : ''}${e.conta ? ' · cc ' + e.conta : ''}` : null} className="sm:col-span-2" />
                <FormBox label="Chave PIX" value={e.chavePix} />
              </div>
            </Card>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Contatos de emergência</h4>
              {e.contatosEmergencia.length === 0 ? (
                <p className="text-sm text-text-tertiary">Nenhum contato cadastrado.</p>
              ) : (
                <div className="flex flex-col gap-1 text-sm">
                  {e.contatosEmergencia.map((c) => (
                    <div key={c.id}>
                      {c.nome} · {c.parentesco}
                      {c.telefone ? ` · ${c.telefone}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Férias — Período Aquisitivo</h4>
                <Card>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-tertiary">
                        <th className="pb-2">Início</th>
                        <th className="pb-2">Fim</th>
                        <th className="pb-2 print:hidden">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(feriasHistorico?.periodos ?? []).map((p) => (
                        <tr key={p.id} className="border-t border-divider align-top">
                          <td className="py-2">{formatDate(p.dataInicio)}</td>
                          <td className="py-2">{formatDate(p.dataFim)}</td>
                          <td className="py-2 print:hidden">
                            <Badge tone={STATUS_PERIODO_TONE[p.resumo.status]}>{STATUS_PERIODO_LABEL[p.resumo.status]}</Badge>
                          </td>
                        </tr>
                      ))}
                      {(feriasHistorico?.periodos ?? []).length === 0 && (
                        <tr>
                          <td colSpan={3}>
                            <EmptyState>Sem períodos aquisitivos.</EmptyState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <p className="mt-2 hidden text-xs text-text-tertiary print:block">
                    {(feriasHistorico?.periodos ?? [])
                      .filter((p) => p.resumo.status === 'PERDIDO_POR_AFASTAMENTO')
                      .map((p) => `Período ${formatDate(p.dataInicio)} a ${formatDate(p.dataFim)}: ${STATUS_PERIODO_LABEL.PERDIDO_POR_AFASTAMENTO}.`)
                      .join(' ')}
                  </p>
                </Card>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Férias — Usufruto</h4>
                <Card>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-tertiary">
                        <th className="pb-2">Início</th>
                        <th className="pb-2">Fim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.vacationRequests.map((v) => (
                        <tr key={v.id} className="border-t border-divider">
                          <td className="py-2">{formatDate(v.inicio)}</td>
                          <td className="py-2">{formatDate(v.fim)}</td>
                        </tr>
                      ))}
                      {e.vacationRequests.length === 0 && (
                        <tr>
                          <td colSpan={2}>
                            <EmptyState>Sem férias gozadas registradas.</EmptyState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Férias — Abono Pecuniário</h4>
                <Card>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-tertiary">
                        <th className="pb-2">Período</th>
                        <th className="pb-2">Dias vendidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.vacationRequests.filter((v) => v.diasAbono > 0).map((v) => (
                        <tr key={v.id} className="border-t border-divider">
                          <td className="py-2">{formatDate(v.inicio)} a {formatDate(v.fim)}</td>
                          <td className="py-2">{v.diasAbono}</td>
                        </tr>
                      ))}
                      {e.vacationRequests.filter((v) => v.diasAbono > 0).length === 0 && (
                        <tr>
                          <td colSpan={2}>
                            <EmptyState>Sem abono pecuniário registrado.</EmptyState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Alterações de salário, cargo e/ou função</h4>
              <Card>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-tertiary">
                      <th className="pb-2">Vigente desde</th>
                      <th className="pb-2">Cargo</th>
                      <th className="pb-2">Salário</th>
                      <th className="pb-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.cargoSalarioHistorico.map((h) => (
                      <tr key={h.id} className="border-t border-divider align-top">
                        <td className="py-2">{formatDate(h.vigenciaDesde)}</td>
                        <td className="py-2">{h.cargo}</td>
                        <td className="py-2">{formatBRL(Number(h.salario))}</td>
                        <td className="py-2">
                          {h.motivo}
                          {h.observacao && <div className="text-xs text-text-tertiary">{h.observacao}</div>}
                        </td>
                      </tr>
                    ))}
                    {e.cargoSalarioHistorico.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState>Sem registros.</EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Afastamentos</h4>
              <Card>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-tertiary">
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Início</th>
                      <th className="pb-2">Retorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.leaveRecords.map((l) => (
                      <tr key={l.id} className="border-t border-divider">
                        <td className="py-2">{l.tipo}</td>
                        <td className="py-2">{formatDate(l.inicio)}</td>
                        <td className="py-2">{l.retorno ? formatDate(l.retorno) : 'Em andamento'}</td>
                      </tr>
                    ))}
                    {e.leaveRecords.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <EmptyState>Nenhum afastamento registrado.</EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Acidentes de trabalho e doenças ocupacionais</h4>
                <Card>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-tertiary">
                        <th className="pb-2">Data</th>
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Afastamento</th>
                        <th className="pb-2">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.accidents.map((a) => (
                        <tr key={a.id} className="border-t border-divider align-top">
                          <td className="py-2">{formatDate(a.dataAcidente)}</td>
                          <td className="py-2">{ACCIDENT_TIPO_LABEL[a.tipoAcidente]}</td>
                          <td className="py-2">{a.comAfastamento ? `${a.diasAfastamento} dia(s)` : 'Não'}</td>
                          <td className="py-2">{a.descricao ?? '—'}</td>
                        </tr>
                      ))}
                      {e.accidents.length === 0 && (
                        <tr>
                          <td colSpan={4}>
                            <EmptyState>Nenhum acidente ou doença ocupacional registrada.</EmptyState>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>

              <Card>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Rescisão de contrato de trabalho</h4>
                {e.terminations.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Colaborador ativo — sem rescisão registrada.</p>
                ) : (
                  <div className="flex flex-col gap-1 text-sm">
                    {e.terminations.map((t) => (
                      <div key={t.id}>
                        Data da saída: {formatDate(t.data)} · Tipo: {TERMINATION_TIPO_LABEL[t.tipo]}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Ocorrências</h4>
              <Card>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-tertiary">
                      <th className="pb-2">Data</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Descrição</th>
                      <th className="pb-2">Anexos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.ocorrencias.map((o) => (
                      <tr key={o.id} className="border-t border-divider align-top">
                        <td className="py-2">{formatDate(o.data)}</td>
                        <td className="py-2">{o.tipo}</td>
                        <td className="py-2">{o.descricao}</td>
                        <td className="py-2">{e.documentos.filter((d) => d.ocorrenciaId === o.id).length || '—'}</td>
                      </tr>
                    ))}
                    {e.ocorrencias.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState>Nenhuma ocorrência registrada.</EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>

            <Card>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Observações</h4>
              <div className="h-16 border-b border-dashed border-border-strong" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

interface BeneficioTipoOption {
  id: string;
  nome: string;
  categoria: 'ALIMENTACAO' | 'ACADEMIA' | 'SAUDE' | 'OUTRO';
}
interface ConvenioOption {
  id: string;
  nome: string;
  valorMensalidade: string;
}
interface PlanoOption {
  id: string;
  nome: string;
  operadora: string | null;
  faixasEtarias: { id: string; idadeMin: number; idadeMax: number; valor: string }[];
}
interface AdesaoValeDiario {
  id: string;
  valorDiario: string;
  dataInicio: string;
  dataFim: string | null;
  beneficioTipo: { id: string; nome: string };
}
interface AdesaoAcademia {
  id: string;
  dataAdesao: string;
  dataCancelamento: string | null;
  convenio: { id: string; nome: string; valorMensalidade: string };
}
interface DependentePlanoSaude {
  id: string;
  nome: string;
  dataNascimento: string;
  parentesco: string | null;
}
interface AdesaoPlanoSaude {
  id: string;
  dataAdesao: string;
  dataCancelamento: string | null;
  plano: { id: string; nome: string };
  dependentes: DependentePlanoSaude[];
}
interface AdesaoBeneficioFixo {
  id: string;
  valorMensal: string;
  dataInicio: string;
  dataFim: string | null;
  beneficioTipo: { id: string; nome: string };
}
interface ResumoBeneficios {
  valeDiario: AdesaoValeDiario[];
  academia: AdesaoAcademia[];
  planoSaude: AdesaoPlanoSaude[];
  beneficioFixo: AdesaoBeneficioFixo[];
}

const CATEGORIA_BENEFICIO_LABEL: Record<BeneficioTipoOption['categoria'], string> = {
  ALIMENTACAO: 'Alimentação',
  ACADEMIA: 'Academia',
  SAUDE: 'Saúde',
  OUTRO: 'Outro',
};

/** Opção de um benefício do tipo "faixas/planos" (Academia/Saúde) -- valor null quando ainda não dá pra calcular (ex.: plano de saúde sem faixa etária cadastrada pra idade do colaborador). */
interface OpcaoBeneficio {
  id: string;
  nome: string;
  valor: number | null;
}

/** Adesão ativa já normalizada, independente da categoria/tabela de origem. */
interface AdesaoResolvida {
  id: string;
  dataInicio: string;
  opcaoId: string | null;
  opcaoNome: string | null;
  valor: number | null;
  dependentes?: DependentePlanoSaude[];
}

const DIAS_UTEIS_ESTIMADO = 22;

/**
 * Lista dirigida pelo catálogo (BeneficioTipo, já cadastrado em Benefícios →
 * Tipos e coparticipação) em vez de 4 cards fixos. Alimentação/Outro têm
 * valor customizável por adesão; Academia/Saúde têm valor vindo de uma
 * opção cadastrada (convênio/plano) -- quando só existe 1 opção, mostra
 * direto como somente-leitura em vez de dropdown com 1 item só.
 */
function BeneficiosTab({ employeeId, dataNascimento }: { employeeId: string; dataNascimento: string | null }) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<'' | BeneficioTipoOption['categoria']>('');
  const [draftValores, setDraftValores] = useState<Record<string, number>>({});

  const { data: resumo } = useQuery({
    queryKey: ['dp', 'benefits', 'employee', employeeId],
    queryFn: async () => (await api.get<ResumoBeneficios>(`/dp/benefits/employees/${employeeId}`)).data,
  });
  const { data: tipos } = useQuery({
    queryKey: ['dp', 'benefits', 'tipos'],
    queryFn: async () => (await api.get<BeneficioTipoOption[]>('/dp/benefits/tipos')).data,
  });
  const { data: convenios } = useQuery({
    queryKey: ['dp', 'benefits', 'convenios-academia'],
    queryFn: async () => (await api.get<ConvenioOption[]>('/dp/benefits/convenios-academia')).data,
  });
  const { data: planos } = useQuery({
    queryKey: ['dp', 'benefits', 'planos-saude'],
    queryFn: async () => (await api.get<PlanoOption[]>('/dp/benefits/planos-saude')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', 'employee', employeeId] });

  const addVale = useMutation({
    mutationFn: async (vars: { tipoId: string; valorDiario: number; dataInicio: string }) =>
      api.post(`/dp/benefits/employees/${employeeId}/vale-diario`, { beneficioTipoId: vars.tipoId, valorDiario: vars.valorDiario, dataInicio: vars.dataInicio }),
    onSuccess: invalidate,
  });
  const updateVale = useMutation({
    mutationFn: async (vars: { adesaoId: string; valorDiario: number }) =>
      api.patch(`/dp/benefits/employees/${employeeId}/vale-diario/${vars.adesaoId}`, { valorDiario: vars.valorDiario }),
    onSuccess: invalidate,
  });
  const cancelVale = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/vale-diario/${adesaoId}`),
    onSuccess: invalidate,
  });

  const addFixo = useMutation({
    mutationFn: async (vars: { tipoId: string; valorMensal: number; dataInicio: string }) =>
      api.post(`/dp/benefits/employees/${employeeId}/outros`, { beneficioTipoId: vars.tipoId, valorMensal: vars.valorMensal, dataInicio: vars.dataInicio }),
    onSuccess: invalidate,
  });
  const updateFixo = useMutation({
    mutationFn: async (vars: { adesaoId: string; valorMensal: number }) =>
      api.patch(`/dp/benefits/employees/${employeeId}/outros/${vars.adesaoId}`, { valorMensal: vars.valorMensal }),
    onSuccess: invalidate,
  });
  const cancelFixo = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/outros/${adesaoId}`),
    onSuccess: invalidate,
  });

  const addAcademia = useMutation({
    mutationFn: async (vars: { convenioId: string; dataAdesao: string }) => api.post(`/dp/benefits/employees/${employeeId}/academia`, vars),
    onSuccess: invalidate,
  });
  const cancelAcademia = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/academia/${adesaoId}`),
    onSuccess: invalidate,
  });

  const addSaude = useMutation({
    mutationFn: async (vars: { planoId: string; dataAdesao: string }) => api.post(`/dp/benefits/employees/${employeeId}/plano-saude`, vars),
    onSuccess: invalidate,
  });
  const cancelSaude = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/plano-saude/${adesaoId}`),
    onSuccess: invalidate,
  });

  const [depFormAdesaoId, setDepFormAdesaoId] = useState<string | null>(null);
  const [depNome, setDepNome] = useState('');
  const [depDataNascimento, setDepDataNascimento] = useState('');
  const [depParentesco, setDepParentesco] = useState('');
  const addDependente = useMutation({
    mutationFn: async (adesaoId: string) =>
      api.post(`/dp/benefits/employees/${employeeId}/plano-saude/${adesaoId}/dependentes`, {
        nome: depNome,
        dataNascimento: depDataNascimento,
        parentesco: depParentesco || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setDepFormAdesaoId(null);
      setDepNome('');
      setDepDataNascimento('');
      setDepParentesco('');
    },
  });
  const removeDependente = useMutation({
    mutationFn: async (vars: { adesaoId: string; dependenteId: string }) =>
      api.delete(`/dp/benefits/employees/${employeeId}/plano-saude/${vars.adesaoId}/dependentes/${vars.dependenteId}`),
    onSuccess: invalidate,
  });

  const idade = (() => {
    if (!dataNascimento) return null;
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let anos = hoje.getUTCFullYear() - nasc.getUTCFullYear();
    const aniversarioPassou = hoje.getUTCMonth() > nasc.getUTCMonth() || (hoje.getUTCMonth() === nasc.getUTCMonth() && hoje.getUTCDate() >= nasc.getUTCDate());
    if (!aniversarioPassou) anos--;
    return anos;
  })();

  function valorPlanoSaude(planoId: string): number | null {
    const plano = planos?.find((p) => p.id === planoId);
    if (!plano || idade == null) return null;
    const faixa = plano.faixasEtarias.find((f) => idade >= f.idadeMin && idade <= f.idadeMax);
    return faixa ? Number(faixa.valor) : null;
  }

  function opcoesPara(tipo: BeneficioTipoOption): OpcaoBeneficio[] | null {
    if (tipo.categoria === 'ACADEMIA') return (convenios ?? []).map((c) => ({ id: c.id, nome: c.nome, valor: Number(c.valorMensalidade) }));
    if (tipo.categoria === 'SAUDE') return (planos ?? []).map((p) => ({ id: p.id, nome: p.nome, valor: valorPlanoSaude(p.id) }));
    return null;
  }

  function resolverAdesao(tipo: BeneficioTipoOption): AdesaoResolvida | null {
    if (!resumo) return null;
    if (tipo.categoria === 'ALIMENTACAO') {
      const a = resumo.valeDiario.find((v) => v.beneficioTipo.id === tipo.id && !v.dataFim);
      return a ? { id: a.id, dataInicio: a.dataInicio, opcaoId: null, opcaoNome: null, valor: Number(a.valorDiario) } : null;
    }
    if (tipo.categoria === 'OUTRO') {
      const a = resumo.beneficioFixo.find((f) => f.beneficioTipo.id === tipo.id && !f.dataFim);
      return a ? { id: a.id, dataInicio: a.dataInicio, opcaoId: null, opcaoNome: null, valor: Number(a.valorMensal) } : null;
    }
    if (tipo.categoria === 'ACADEMIA') {
      const a = resumo.academia.find((x) => !x.dataCancelamento);
      return a ? { id: a.id, dataInicio: a.dataAdesao, opcaoId: a.convenio.id, opcaoNome: a.convenio.nome, valor: Number(a.convenio.valorMensalidade) } : null;
    }
    const a = resumo.planoSaude.find((x) => !x.dataCancelamento);
    return a ? { id: a.id, dataInicio: a.dataAdesao, opcaoId: a.plano.id, opcaoNome: a.plano.nome, valor: valorPlanoSaude(a.plano.id), dependentes: a.dependentes } : null;
  }

  function setDraftValor(tipoId: string, valor: number | undefined) {
    setDraftValores((prev) => {
      const next = { ...prev };
      if (valor == null) delete next[tipoId];
      else next[tipoId] = valor;
      return next;
    });
  }

  function salvarNovo(tipo: BeneficioTipoOption, form: { valor: string; opcaoId: string; dataInicio: string }) {
    if (tipo.categoria === 'ALIMENTACAO') addVale.mutate({ tipoId: tipo.id, valorDiario: Number(form.valor), dataInicio: form.dataInicio });
    else if (tipo.categoria === 'OUTRO') addFixo.mutate({ tipoId: tipo.id, valorMensal: Number(form.valor), dataInicio: form.dataInicio });
    else if (tipo.categoria === 'ACADEMIA') addAcademia.mutate({ convenioId: form.opcaoId, dataAdesao: form.dataInicio });
    else addSaude.mutate({ planoId: form.opcaoId, dataAdesao: form.dataInicio });
  }

  async function salvarEdicao(tipo: BeneficioTipoOption, adesaoId: string, form: { valor: string; opcaoId: string; dataInicio: string }) {
    if (tipo.categoria === 'ALIMENTACAO') updateVale.mutate({ adesaoId, valorDiario: Number(form.valor) });
    else if (tipo.categoria === 'OUTRO') updateFixo.mutate({ adesaoId, valorMensal: Number(form.valor) });
    else if (tipo.categoria === 'ACADEMIA') {
      // Sem endpoint de update para academia -- edita trocando a adesão (cancela a antiga, cria a nova).
      await cancelAcademia.mutateAsync(adesaoId);
      addAcademia.mutate({ convenioId: form.opcaoId, dataAdesao: form.dataInicio });
    } else {
      await cancelSaude.mutateAsync(adesaoId);
      addSaude.mutate({ planoId: form.opcaoId, dataAdesao: form.dataInicio });
    }
  }

  function remover(tipo: BeneficioTipoOption, adesaoId: string) {
    if (tipo.categoria === 'ALIMENTACAO') cancelVale.mutate(adesaoId);
    else if (tipo.categoria === 'OUTRO') cancelFixo.mutate(adesaoId);
    else if (tipo.categoria === 'ACADEMIA') cancelAcademia.mutate(adesaoId);
    else cancelSaude.mutate(adesaoId);
  }

  const buscaNormalizada = busca.trim().toLowerCase();
  const itens = (tipos ?? [])
    .filter((t) => !filtroCategoria || t.categoria === filtroCategoria)
    .filter((t) => !buscaNormalizada || t.nome.toLowerCase().includes(buscaNormalizada));

  let totalAtivos = 0;
  let custoMensalEstimado = 0;
  for (const tipo of tipos ?? []) {
    const draft = draftValores[tipo.id];
    const adesao = resolverAdesao(tipo);
    if (draft == null && !adesao) continue;
    totalAtivos++;
    const valorRaw = draft ?? adesao?.valor ?? null;
    if (valorRaw != null) custoMensalEstimado += tipo.categoria === 'ALIMENTACAO' ? valorRaw * DIAS_UTEIS_ESTIMADO : valorRaw;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Benefícios ativos" value={totalAtivos} />
        <KpiCard label="Custo mensal estimado" value={formatBRL(custoMensalEstimado)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar benefício…"
          className="w-64 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as typeof filtroCategoria)}
          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {(Object.keys(CATEGORIA_BENEFICIO_LABEL) as BeneficioTipoOption['categoria'][]).map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_BENEFICIO_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0">
        <ul>
          {itens.map((tipo) => (
            <BeneficioLinha
              key={tipo.id}
              tipo={tipo}
              adesao={resolverAdesao(tipo)}
              opcoes={opcoesPara(tipo)}
              onDraftChange={(valor) => setDraftValor(tipo.id, valor)}
              onSalvarNovo={(form) => salvarNovo(tipo, form)}
              onSalvarEdicao={(adesaoId, form) => salvarEdicao(tipo, adesaoId, form)}
              onRemover={(adesaoId) => remover(tipo, adesaoId)}
              dependentesForm={
                tipo.categoria === 'SAUDE'
                  ? {
                      aberto: depFormAdesaoId,
                      onAbrir: setDepFormAdesaoId,
                      nome: depNome,
                      setNome: setDepNome,
                      dataNascimento: depDataNascimento,
                      setDataNascimento: setDepDataNascimento,
                      parentesco: depParentesco,
                      setParentesco: setDepParentesco,
                      salvando: addDependente.isPending,
                      onAdicionar: (adesaoId) => addDependente.mutate(adesaoId),
                      onRemover: (adesaoId, dependenteId) => removeDependente.mutate({ adesaoId, dependenteId }),
                    }
                  : undefined
              }
            />
          ))}
          {itens.length === 0 && (
            <li className="p-6 text-center text-sm text-text-tertiary">
              {(tipos?.length ?? 0) === 0
                ? 'Nenhum benefício cadastrado ainda. Cadastre em Benefícios → Tipos e coparticipação.'
                : 'Nenhum benefício encontrado para esse filtro.'}
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function BeneficioLinha({
  tipo,
  adesao,
  opcoes,
  onDraftChange,
  onSalvarNovo,
  onSalvarEdicao,
  onRemover,
  dependentesForm,
}: {
  tipo: BeneficioTipoOption;
  adesao: AdesaoResolvida | null;
  opcoes: OpcaoBeneficio[] | null;
  onDraftChange: (valor: number | undefined) => void;
  onSalvarNovo: (form: { valor: string; opcaoId: string; dataInicio: string }) => void;
  onSalvarEdicao: (adesaoId: string, form: { valor: string; opcaoId: string; dataInicio: string }) => void;
  onRemover: (adesaoId: string) => void;
  dependentesForm?: {
    aberto: string | null;
    onAbrir: (adesaoId: string | null) => void;
    nome: string;
    setNome: (v: string) => void;
    dataNascimento: string;
    setDataNascimento: (v: string) => void;
    parentesco: string;
    setParentesco: (v: string) => void;
    salvando: boolean;
    onAdicionar: (adesaoId: string) => void;
    onRemover: (adesaoId: string, dependenteId: string) => void;
  };
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formValor, setFormValor] = useState('');
  const [formOpcaoId, setFormOpcaoId] = useState('');
  const [formDataInicio, setFormDataInicio] = useState('');

  const unidadeLabel = tipo.categoria === 'ALIMENTACAO' ? '/dia' : '/mês';
  const opcaoUnica = opcoes && opcoes.length === 1 ? opcoes[0] : null;

  function abrirNovo() {
    setEditando(false);
    setFormValor('');
    setFormOpcaoId(opcaoUnica?.id ?? '');
    setFormDataInicio(new Date().toISOString().slice(0, 10));
    setAberto(true);
    onDraftChange(opcaoUnica?.valor ?? 0);
  }

  function abrirEdicao() {
    if (!adesao) return;
    setEditando(true);
    setFormValor(adesao.valor != null ? String(adesao.valor) : '');
    setFormOpcaoId(adesao.opcaoId ?? '');
    setFormDataInicio(adesao.dataInicio.slice(0, 10));
    setAberto(true);
    onDraftChange(adesao.valor ?? undefined);
  }

  function fechar() {
    setAberto(false);
    setEditando(false);
    onDraftChange(undefined);
  }

  function handleToggle(ligar: boolean) {
    if (ligar) {
      if (!adesao) abrirNovo();
    } else if (aberto && !editando) {
      fechar();
    } else if (adesao) {
      onRemover(adesao.id);
      if (aberto) fechar();
    }
  }

  function salvar() {
    if (opcoes && !formOpcaoId) return;
    if (!opcoes && !formValor) return;
    if (!formDataInicio) return;
    if (editando && adesao) onSalvarEdicao(adesao.id, { valor: formValor, opcaoId: formOpcaoId, dataInicio: formDataInicio });
    else onSalvarNovo({ valor: formValor, opcaoId: formOpcaoId, dataInicio: formDataInicio });
    fechar();
  }

  const opcaoSelecionada = opcoes?.find((o) => o.id === formOpcaoId) ?? null;
  const podeSalvar = (opcoes ? !!formOpcaoId : !!formValor) && !!formDataInicio;

  return (
    <li className="flex flex-col gap-3 border-b border-divider p-4 last:border-0">
      <div className="flex items-start gap-3">
        <Switch checked={!!adesao || aberto} onChange={handleToggle} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-text">{tipo.nome}</span>
            <Badge tone="blue">{CATEGORIA_BENEFICIO_LABEL[tipo.categoria]}</Badge>
          </div>

          {!aberto && adesao && (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span>
                {adesao.opcaoNome && `${adesao.opcaoNome} · `}
                {adesao.valor != null ? `${formatBRL(adesao.valor)}${unidadeLabel}` : 'valor calculado na apuração'} · desde {formatDate(adesao.dataInicio)}
              </span>
              <span className="flex items-center gap-2 text-xs">
                <button onClick={abrirEdicao} className="text-accent hover:underline">
                  editar
                </button>
                <button onClick={() => onRemover(adesao.id)} className="text-danger hover:underline">
                  remover
                </button>
              </span>
            </div>
          )}

          {!aberto && !adesao && <p className="mt-1 text-xs text-text-tertiary">Não ativo para este colaborador.</p>}
        </div>
      </div>

      {aberto && (
        <div className="flex flex-wrap items-end gap-3 border-t border-divider pt-3 pl-8">
          {opcoes ? (
            opcoes.length === 0 ? (
              <p className="text-xs text-text-tertiary">Nenhuma opção cadastrada ainda para essa categoria.</p>
            ) : opcaoUnica ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">{opcaoUnica.nome}</span>
                <span className="rounded-[10px] border border-border-strong bg-surface-alt px-3 py-2 text-text-tertiary">
                  {opcaoUnica.valor != null ? `${formatBRL(opcaoUnica.valor)}${unidadeLabel}` : 'calculado na apuração'}
                </span>
              </label>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Opção</span>
                <select
                  value={formOpcaoId}
                  onChange={(e) => {
                    setFormOpcaoId(e.target.value);
                    const opcao = opcoes.find((o) => o.id === e.target.value);
                    onDraftChange(opcao?.valor ?? 0);
                  }}
                  className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                >
                  <option value="">Selecione…</option>
                  {opcoes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                {opcaoSelecionada && (
                  <span className="text-xs text-text-tertiary">
                    {opcaoSelecionada.valor != null ? `${formatBRL(opcaoSelecionada.valor)}${unidadeLabel}` : 'valor calculado na apuração'}
                  </span>
                )}
              </label>
            )
          ) : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Valor{unidadeLabel}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formValor}
                onChange={(e) => {
                  setFormValor(e.target.value);
                  onDraftChange(e.target.value ? Number(e.target.value) : 0);
                }}
                className="w-32 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Início</span>
            <input
              type="date"
              value={formDataInicio}
              onChange={(e) => setFormDataInicio(e.target.value)}
              disabled={editando && !opcoes}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 disabled:opacity-60"
            />
          </label>

          <Button onClick={salvar} disabled={!podeSalvar}>
            Salvar
          </Button>
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
        </div>
      )}

      {tipo.categoria === 'SAUDE' && adesao && dependentesForm && (
        <div className="border-t border-divider pt-3 pl-8">
          <div className="flex flex-col gap-1 text-xs text-text-secondary">
            {(adesao.dependentes ?? []).map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <span>
                  {d.nome} · {d.parentesco ?? '—'} · {formatDate(d.dataNascimento)}
                </span>
                <button onClick={() => dependentesForm.onRemover(adesao.id, d.id)} className="text-danger hover:underline">
                  remover
                </button>
              </div>
            ))}
          </div>
          {dependentesForm.aberto === adesao.id ? (
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                dependentesForm.onAdicionar(adesao.id);
              }}
            >
              <input
                placeholder="Nome"
                value={dependentesForm.nome}
                onChange={(ev) => dependentesForm.setNome(ev.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs"
              />
              <input
                type="date"
                value={dependentesForm.dataNascimento}
                onChange={(ev) => dependentesForm.setDataNascimento(ev.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Parentesco"
                value={dependentesForm.parentesco}
                onChange={(ev) => dependentesForm.setParentesco(ev.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs"
              />
              <Button type="submit" variant="secondary" disabled={dependentesForm.salvando}>
                Adicionar
              </Button>
            </form>
          ) : (
            <button onClick={() => dependentesForm.onAbrir(adesao.id)} className="mt-2 text-xs text-accent hover:underline">
              + dependente no plano
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Section({
  title,
  children,
  className = 'flex flex-col gap-3',
  cardClassName = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <Card className={cardClassName}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className={className}>{children}</div>
    </Card>
  );
}

function Row({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 text-sm ${className}`}>
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function FormBox({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-border-strong px-2 py-1.5 text-xs ${className}`}>
      <div className="text-[9px] uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className="font-medium text-text">{value || '—'}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="text-text-secondary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text"
      >
        <option value="">Não informado</option>
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        step={step}
        min={type === 'number' ? 0 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
      />
    </label>
  );
}
