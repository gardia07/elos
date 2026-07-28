'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { complianceTone, maskCPF, maskPhoneBR } from '@/lib/format';
import { Badge, Button, Card, KpiCard } from '@/components/ui';

const ESCOLARIDADE_OPTIONS = [
  'Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo',
  'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
];
const ESTADO_CIVIL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'];
const GENERO_OPTIONS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];

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
  contatoEmergenciaNome: string | null;
  contatoEmergenciaTelefone: string | null;
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
  nomeMae: string | null;
  nomePai: string | null;
  pis: string | null;
  ctps: string | null;
  tituloEleitor: string | null;
  tituloEleitorZona: string | null;
  tituloEleitorSecao: string | null;
  conjugeNome: string | null;
  conjugeCpf: string | null;
  salario: string;
  tipoContrato: 'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  tipoSalario: 'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  feriasSaldo: number;
  feriasVencimento: string;
  feriasVencimentoAlerta: boolean;
  proximasFerias: { inicio: string; fim: string } | null;
  tempoDeCasa: { anos: number; meses: number };
  dependentes: { id: string; nome: string; parentesco: string; cpf: string | null }[];
  historico: { id: string; evento: string; categoria: string; autor: string; data: string }[];
  documentos: { id: string; nome: string; tipo: string; tamanho: string; uploadEm: string }[];
  feriasHistorico: { id: string; periodo: string; dias: number }[];
  leaveRecords: { id: string; tipo: string; inicio: string; retorno: string | null }[];
  evaluationRecords: { id: string; autoNota: string | null; gestorNota: string | null; cycle: { nome: string } }[];
}

type EditFields = {
  email: string; telefone: string; endereco: string;
  contatoEmergenciaNome: string; contatoEmergenciaTelefone: string;
  dataNascimento: string; escolaridade: string; estadoCivil: string; nacionalidade: string;
  nomeMae: string; nomePai: string; genero: string; cnh: string; rg: string;
  rgOrgaoExpedidor: string; rgDataExpedicao: string;
  tituloEleitor: string; tituloEleitorZona: string; tituloEleitorSecao: string; pis: string; ctps: string; cpf: string;
  conjugeNome: string; conjugeCpf: string;
  matricula: string; dataAdmissao: string;
  cargo: string; departamento: string; filial: string; gestorDireto: string; tipoContrato: 'CLT' | 'ESTAGIO' | 'PJ' | 'INTERMITENTE';
  tipoSalario: 'MENSALISTA' | 'HORISTA' | 'DIARISTA';
  salario: string;
};

function toEditFields(e: EmployeeDetail): EditFields {
  return {
    email: e.email ?? '', telefone: e.telefone ?? '', endereco: e.endereco ?? '',
    contatoEmergenciaNome: e.contatoEmergenciaNome ?? '', contatoEmergenciaTelefone: e.contatoEmergenciaTelefone ?? '',
    dataNascimento: e.dataNascimento ? e.dataNascimento.slice(0, 10) : '',
    escolaridade: e.escolaridade ?? '', estadoCivil: e.estadoCivil ?? '', nacionalidade: e.nacionalidade ?? '',
    nomeMae: e.nomeMae ?? '', nomePai: e.nomePai ?? '', genero: e.genero ?? '', cnh: e.cnh ?? '', rg: e.rg ?? '',
    rgOrgaoExpedidor: e.rgOrgaoExpedidor ?? '', rgDataExpedicao: e.rgDataExpedicao ? e.rgDataExpedicao.slice(0, 10) : '',
    tituloEleitor: e.tituloEleitor ?? '', tituloEleitorZona: e.tituloEleitorZona ?? '', tituloEleitorSecao: e.tituloEleitorSecao ?? '',
    pis: e.pis ?? '', ctps: e.ctps ?? '', cpf: e.cpf ?? '',
    conjugeNome: e.conjugeNome ?? '', conjugeCpf: e.conjugeCpf ?? '',
    matricula: e.matricula, dataAdmissao: e.dataAdmissao.slice(0, 10),
    cargo: e.cargo, departamento: e.departamento, filial: e.filial ?? '', gestorDireto: e.gestorDireto ?? '',
    tipoContrato: e.tipoContrato,
    tipoSalario: e.tipoSalario,
    salario: String(Number(e.salario)),
  };
}

const TABS = ['geral', 'ferias', 'beneficios', 'avaliacoes', 'documentos', 'historico'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  geral: 'Visão geral',
  ferias: 'Férias',
  beneficios: 'Benefícios',
  avaliacoes: 'Avaliações',
  documentos: 'Documentos',
  historico: 'Histórico',
};

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
  const [novoCargo, setNovoCargo] = useState('');
  const [novoSalario, setNovoSalario] = useState('');
  const [motivoPromocao, setMotivoPromocao] = useState<'Promoção' | 'Reajuste anual' | 'Dissídio coletivo' | 'Outro'>('Promoção');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditFields | null>(null);
  const [motivoSalario, setMotivoSalario] = useState('');
  const [saveEditError, setSaveEditError] = useState('');
  const [showDependenteForm, setShowDependenteForm] = useState(false);
  const [depNome, setDepNome] = useState('');
  const [depParentesco, setDepParentesco] = useState('');
  const [depCpf, setDepCpf] = useState('');
  const [vacInicio, setVacInicio] = useState('');
  const [vacFim, setVacFim] = useState('');
  const [docNome, setDocNome] = useState('');
  const [docTipo, setDocTipo] = useState('');

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
      api.post(`/rh/employees/${id}/promote`, { cargo: novoCargo || undefined, salario: Number(novoSalario), motivo: motivoPromocao }),
    onSuccess: () => {
      invalidate();
      setShowPromote(false);
      setNovoCargo('');
      setNovoSalario('');
      setMotivoPromocao('Promoção');
    },
  });

  const salarioAlterado = !!edit && !!e && Number(edit.salario) !== Number(e.salario);

  const saveEdit = useMutation({
    mutationFn: async () => {
      setSaveEditError('');
      return api.patch(`/rh/employees/${id}`, {
        ...edit,
        salario: edit ? Number(edit.salario) : undefined,
        motivoAlteracaoSalario: salarioAlterado ? motivoSalario : undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setMotivoSalario('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setSaveEditError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível salvar as alterações.');
    },
  });

  const addDependente = useMutation({
    mutationFn: async () => api.post(`/rh/employees/${id}/dependentes`, { nome: depNome, parentesco: depParentesco, cpf: depCpf }),
    onSuccess: () => {
      invalidate();
      setShowDependenteForm(false);
      setDepNome('');
      setDepParentesco('');
      setDepCpf('');
    },
  });

  const requestVacation = useMutation({
    mutationFn: async () => api.post('/rh/vacations/requests', { employeeId: id, inicio: vacInicio, fim: vacFim }),
    onSuccess: () => {
      invalidate();
      setVacInicio('');
      setVacFim('');
    },
  });

  const addDocumento = useMutation({
    mutationFn: async () => api.post(`/rh/employees/${id}/documentos`, { nome: docNome, tipo: docTipo, tamanho: '—' }),
    onSuccess: () => {
      invalidate();
      setDocNome('');
      setDocTipo('');
    },
  });

  const removeDocumento = useMutation({
    mutationFn: async (documentoId: string) => api.delete(`/rh/employees/${id}/documentos/${documentoId}`),
    onSuccess: invalidate,
  });

  const { data: compliance } = useQuery({
    queryKey: ['rh', 'documents', id],
    queryFn: async () =>
      (await api.get<{ compliance: number; missingFields: string[]; documentos: DocumentRequirementStatus[] }>(`/rh/documents/employees/${id}`)).data,
    enabled: tab === 'documentos',
  });

  const setDocStatus = useMutation({
    mutationFn: async (vars: { requirementId: string; status: DocumentRequirementStatus['status']; arquivoNome?: string }) =>
      api.patch(`/rh/documents/employees/${id}/requirements/${vars.requirementId}`, {
        status: vars.status,
        arquivoNome: vars.arquivoNome,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'documents', id] });
      invalidate();
    },
  });

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
            <Badge tone={e.status === 'ATIVO' ? 'green' : 'grey'}>{e.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
            <Badge tone={complianceTone(e.conformidadeDocumental)}>Conformidade: {e.conformidadeDocumental}%</Badge>
          </div>
          <p className="text-sm text-text-secondary">
            {e.cargo} · {e.departamento} · {e.filial ?? '—'} · gestor: {e.gestorDireto || 'Não atribuído'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {e.status === 'ATIVO' && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setShowPromote((s) => !s);
              }}
            >
              Alterar salário
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setShowPromote(false);
              setEdit(toEditFields(e));
              setMotivoSalario('');
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

      {showPromote && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Alterar salário</h3>
          <p className="mb-3 text-xs text-text-tertiary">
            Use para reajustes anuais, promoções ou dissídios coletivos — fica registrado no histórico do colaborador. Para corrigir um dado
            cadastrado errado, use &quot;Editar dados&quot;.
          </p>
          <form
            className="flex flex-wrap items-end gap-3"
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
              <span className="text-text-secondary">Novo cargo (se houver)</span>
              <input value={novoCargo} onChange={(ev) => setNovoCargo(ev.target.value)} placeholder={e.cargo} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Novo salário</span>
              <input type="number" value={novoSalario} onChange={(ev) => setNovoSalario(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={promote.isPending}>
              Confirmar
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPromote(false)}>
              Cancelar
            </Button>
          </form>
        </Card>
      )}

      <div className="flex gap-2 border-b border-divider">
        {TABS.map((t) => (
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
              {salarioAlterado && !motivoSalario && (
                <p className="text-xs text-danger">Preencha o motivo da correção do salário (em Dados contratuais) para salvar.</p>
              )}
              {saveEditError && <p className="text-xs text-danger">{saveEditError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setMotivoSalario('');
                    setSaveEditError('');
                  }}
                >
                  Cancelar
                </Button>
                <Button disabled={saveEdit.isPending || (salarioAlterado && !motivoSalario)} onClick={() => saveEdit.mutate()}>
                  {saveEdit.isPending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          )}

          {!editing || !edit ? (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Informações de contato" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Row label="E-mail" value={e.email ?? '—'} />
                  <Row label="Telefone" value={e.telefone ?? '—'} />
                  <Row label="Endereço" value={e.endereco ?? '—'} className="sm:col-span-2" />
                  <Row
                    label="Contato de emergência"
                    value={e.contatoEmergenciaNome ? `${e.contatoEmergenciaNome} · ${e.contatoEmergenciaTelefone ?? '—'}` : '—'}
                    className="sm:col-span-2"
                  />
                </Section>

                <Section title="Cônjuge e dependentes">
                  <Row label="Cônjuge" value={e.conjugeNome ? `${e.conjugeNome} · ${e.conjugeCpf ?? '—'}` : '—'} />
                  <div className="mt-2 flex flex-col gap-2">
                    {e.dependentes.map((d) => (
                      <div key={d.id} className="flex justify-between text-sm text-text-secondary">
                        <span>{d.nome}</span>
                        <span>
                          {d.parentesco} · {d.cpf ?? '—'}
                        </span>
                      </div>
                    ))}
                    {e.dependentes.length === 0 && <p className="text-sm text-text-tertiary">Nenhum dependente cadastrado.</p>}
                    {!showDependenteForm ? (
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
                        <Button type="submit" disabled={addDependente.isPending}>
                          Adicionar
                        </Button>
                      </form>
                    )}
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
                <Row label="RG" value={e.rg ?? '—'} />
                <Row label="Órgão expedidor do RG" value={e.rgOrgaoExpedidor ?? '—'} />
                <Row label="Data de expedição do RG" value={e.rgDataExpedicao ? formatDate(e.rgDataExpedicao) : '—'} />
                <Row label="Título de eleitor" value={e.tituloEleitor ?? '—'} />
                <Row label="Zona eleitoral" value={e.tituloEleitorZona ?? '—'} />
                <Row label="Seção eleitoral" value={e.tituloEleitorSecao ?? '—'} />
                <Row label="PIS" value={e.pis ?? '—'} />
                <Row label="CTPS" value={e.ctps ?? '—'} />
                <Row label="CPF" value={e.cpf ?? '—'} />
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
                    <EditField label="Contato de emergência (nome)" value={edit.contatoEmergenciaNome} onChange={(v) => setEdit({ ...edit, contatoEmergenciaNome: v })} />
                    <EditField label="Contato de emergência (telefone)" value={edit.contatoEmergenciaTelefone} onChange={(v) => setEdit({ ...edit, contatoEmergenciaTelefone: maskPhoneBR(v) })} />
                  </div>
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
                  <EditField label="RG" value={edit.rg} onChange={(v) => setEdit({ ...edit, rg: v })} />
                  <EditField label="Órgão expedidor do RG" value={edit.rgOrgaoExpedidor} onChange={(v) => setEdit({ ...edit, rgOrgaoExpedidor: v })} placeholder="SSP/SP" />
                  <EditField label="Data de expedição do RG" type="date" value={edit.rgDataExpedicao} onChange={(v) => setEdit({ ...edit, rgDataExpedicao: v })} />
                  <EditField label="Título de eleitor" value={edit.tituloEleitor} onChange={(v) => setEdit({ ...edit, tituloEleitor: v })} />
                  <EditField label="Zona eleitoral" value={edit.tituloEleitorZona} onChange={(v) => setEdit({ ...edit, tituloEleitorZona: v })} />
                  <EditField label="Seção eleitoral" value={edit.tituloEleitorSecao} onChange={(v) => setEdit({ ...edit, tituloEleitorSecao: v })} />
                  <EditField label="PIS" value={edit.pis} onChange={(v) => setEdit({ ...edit, pis: v })} />
                  <EditField label="CTPS" value={edit.ctps} onChange={(v) => setEdit({ ...edit, ctps: v })} />
                  <EditField label="CPF" value={edit.cpf} onChange={(v) => setEdit({ ...edit, cpf: maskCPF(v) })} />
                </div>
              </Section>

              <Section title="Dados contratuais">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Matrícula" value={edit.matricula} onChange={(v) => setEdit({ ...edit, matricula: v })} />
                  <EditField label="Data de admissão" type="date" value={edit.dataAdmissao} onChange={(v) => setEdit({ ...edit, dataAdmissao: v })} />
                  <EditField label="Cargo" value={edit.cargo} onChange={(v) => setEdit({ ...edit, cargo: v })} />
                  <EditField label="Departamento" value={edit.departamento} onChange={(v) => setEdit({ ...edit, departamento: v })} />
                  <EditField label="Filial" value={edit.filial} onChange={(v) => setEdit({ ...edit, filial: v })} />
                  <EditField label="Salário" type="number" value={edit.salario} onChange={(v) => setEdit({ ...edit, salario: v })} />
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
                  <label className="mt-3 flex flex-col gap-1.5 text-sm">
                    <span className="text-text-secondary">Motivo da correção do salário (obrigatório)</span>
                    <input
                      value={motivoSalario}
                      onChange={(ev) => setMotivoSalario(ev.target.value)}
                      placeholder="Ex.: erro de digitação no cadastro inicial"
                      required
                      className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                    />
                    <span className="text-xs text-text-tertiary">
                      Para reajustes anuais, promoções ou dissídios, use o botão &quot;Alterar salário&quot; em vez de editar aqui.
                    </span>
                  </label>
                )}
              </Section>
            </form>
          )}
        </div>
      )}

      {tab === 'ferias' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Saldo disponível" value={`${e.feriasSaldo} dias`} />
            <KpiCard label="Próximas férias" value={e.proximasFerias ? `${formatDate(e.proximasFerias.inicio)} a ${formatDate(e.proximasFerias.fim)}` : '—'} />
            <KpiCard
              label="Vencimento do período aquisitivo"
              value={<span className={e.feriasVencimentoAlerta ? 'text-danger' : ''}>{formatDate(e.feriasVencimento)}</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Section title="Solicitar férias">
              <form
                className="flex flex-col items-start gap-3"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  requestVacation.mutate();
                }}
              >
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Início</span>
                  <input type="date" value={vacInicio} onChange={(ev) => setVacInicio(ev.target.value)} required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <label className="flex w-full flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Fim</span>
                  <input type="date" value={vacFim} onChange={(ev) => setVacFim(ev.target.value)} required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <Button type="submit" disabled={requestVacation.isPending}>
                  Solicitar
                </Button>
              </form>
            </Section>

            <Section title="Histórico de férias gozadas">
              {e.feriasHistorico.length === 0 && <p className="text-sm text-text-tertiary">Sem registros.</p>}
              <ul className="flex flex-col gap-1 text-sm text-text-secondary">
                {e.feriasHistorico.map((f) => (
                  <li key={f.id}>
                    {f.periodo} — {f.dias} dias
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Afastamentos">
              {e.leaveRecords.length === 0 && <p className="text-sm text-text-tertiary">Nenhum afastamento registrado.</p>}
              <ul className="flex flex-col gap-1 text-sm text-text-secondary">
                {e.leaveRecords.map((l) => (
                  <li key={l.id}>
                    {l.tipo} — {formatDate(l.inicio)} {l.retorno ? `a ${formatDate(l.retorno)}` : '(em andamento)'}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      )}

      {tab === 'beneficios' && <BeneficiosTab employeeId={e.id} />}

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
                      className="rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs"
                    >
                      <option value="MISSING">Faltante</option>
                      <option value="PENDING">Em análise</option>
                      <option value="COMPLIANT">Conforme</option>
                      <option value="REJECTED">Não conforme</option>
                      <option value="NAO_SE_APLICA">Não se aplica</option>
                    </select>
                    <label className="cursor-pointer rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs text-text-secondary hover:border-accent">
                      Anexar
                      <input
                        type="file"
                        className="hidden"
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (file) setDocStatus.mutate({ requirementId: d.requirementId, status: 'COMPLIANT', arquivoNome: file.name });
                          ev.target.value = '';
                        }}
                      />
                    </label>
                  </div>
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
                  <button onClick={() => removeDocumento.mutate(d.id)} className="text-xs text-danger hover:underline">
                    Remover
                  </button>
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
                <span className="text-text-secondary">Nome do arquivo</span>
                <input value={docNome} onChange={(ev) => setDocNome(ev.target.value)} required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex w-full flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Tipo</span>
                <input value={docTipo} onChange={(ev) => setDocTipo(ev.target.value)} placeholder="Contrato, Documento pessoal…" required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <Button type="submit" disabled={addDocumento.isPending}>
                Anexar arquivo
              </Button>
            </form>
          </Card>
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <Card className="max-w-2xl">
          {e.historico.length === 0 && <p className="text-sm text-text-tertiary">Sem eventos.</p>}
          <ul className="flex flex-col gap-2 text-sm">
            {e.historico.map((h) => (
              <li key={h.id} className="flex flex-col">
                <span>{h.evento}</span>
                <span className="text-xs text-text-tertiary">
                  {h.categoria} · {formatDate(h.data)} · {h.autor}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

interface BeneficioTipoOption {
  id: string;
  nome: string;
  categoria: 'ALIMENTACAO' | 'ACADEMIA' | 'SAUDE';
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
  convenio: { id: string; nome: string };
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
interface ResumoBeneficios {
  valeDiario: AdesaoValeDiario[];
  academia: AdesaoAcademia[];
  planoSaude: AdesaoPlanoSaude[];
}

function BeneficiosTab({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();

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
  const tiposAlimentacao = tipos?.filter((t) => t.categoria === 'ALIMENTACAO') ?? [];

  const [showValeForm, setShowValeForm] = useState(false);
  const [valeBeneficioTipoId, setValeBeneficioTipoId] = useState('');
  const [valeValorDiario, setValeValorDiario] = useState('');
  const [valeDataInicio, setValeDataInicio] = useState('');
  const addVale = useMutation({
    mutationFn: async () =>
      api.post(`/dp/benefits/employees/${employeeId}/vale-diario`, {
        beneficioTipoId: valeBeneficioTipoId,
        valorDiario: Number(valeValorDiario),
        dataInicio: valeDataInicio,
      }),
    onSuccess: () => {
      invalidate();
      setShowValeForm(false);
      setValeBeneficioTipoId('');
      setValeValorDiario('');
      setValeDataInicio('');
    },
  });
  const cancelVale = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/vale-diario/${adesaoId}`),
    onSuccess: invalidate,
  });

  const [showAcademiaForm, setShowAcademiaForm] = useState(false);
  const [convenioId, setConvenioId] = useState('');
  const [dataAdesaoAcademia, setDataAdesaoAcademia] = useState('');
  const addAcademia = useMutation({
    mutationFn: async () => api.post(`/dp/benefits/employees/${employeeId}/academia`, { convenioId, dataAdesao: dataAdesaoAcademia }),
    onSuccess: () => {
      invalidate();
      setShowAcademiaForm(false);
      setConvenioId('');
      setDataAdesaoAcademia('');
    },
  });
  const cancelAcademia = useMutation({
    mutationFn: async (adesaoId: string) => api.delete(`/dp/benefits/employees/${employeeId}/academia/${adesaoId}`),
    onSuccess: invalidate,
  });

  const [showSaudeForm, setShowSaudeForm] = useState(false);
  const [planoId, setPlanoId] = useState('');
  const [dataAdesaoSaude, setDataAdesaoSaude] = useState('');
  const addSaude = useMutation({
    mutationFn: async () => api.post(`/dp/benefits/employees/${employeeId}/plano-saude`, { planoId, dataAdesao: dataAdesaoSaude }),
    onSuccess: () => {
      invalidate();
      setShowSaudeForm(false);
      setPlanoId('');
      setDataAdesaoSaude('');
    },
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

  return (
    <div className="flex flex-col gap-4">
      <Section title="Vale-alimentação / Vale-refeição">
        <ul className="flex flex-col gap-1.5 text-sm">
          {resumo?.valeDiario.map((v) => (
            <li key={v.id} className="flex items-center justify-between">
              <span>
                {v.beneficioTipo.nome} · {formatBRL(Number(v.valorDiario))}/dia · desde {formatDate(v.dataInicio)}
                {v.dataFim && ` até ${formatDate(v.dataFim)}`}
              </span>
              {!v.dataFim ? (
                <button onClick={() => cancelVale.mutate(v.id)} className="text-xs text-danger hover:underline">
                  cancelar
                </button>
              ) : (
                <span className="text-xs text-text-tertiary">encerrado</span>
              )}
            </li>
          ))}
          {resumo?.valeDiario.length === 0 && <p className="text-text-tertiary">Nenhuma adesão.</p>}
        </ul>
        {!showValeForm ? (
          <Button variant="secondary" className="self-start" onClick={() => setShowValeForm(true)}>
            Adicionar adesão
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              addVale.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tipo</span>
              <select
                value={valeBeneficioTipoId}
                onChange={(ev) => setValeBeneficioTipoId(ev.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {tiposAlimentacao.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <input type="number" placeholder="Valor diário" value={valeValorDiario} onChange={(ev) => setValeValorDiario(ev.target.value)} required className="w-32 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <input type="date" value={valeDataInicio} onChange={(ev) => setValeDataInicio(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <Button type="submit" disabled={addVale.isPending}>
              Adicionar
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowValeForm(false)}>
              Cancelar
            </Button>
          </form>
        )}
      </Section>

      <Section title="Academia">
        <ul className="flex flex-col gap-1.5 text-sm">
          {resumo?.academia.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span>
                {a.convenio.nome} · desde {formatDate(a.dataAdesao)}
                {a.dataCancelamento && ` até ${formatDate(a.dataCancelamento)}`}
              </span>
              {!a.dataCancelamento ? (
                <button onClick={() => cancelAcademia.mutate(a.id)} className="text-xs text-danger hover:underline">
                  cancelar
                </button>
              ) : (
                <span className="text-xs text-text-tertiary">encerrado</span>
              )}
            </li>
          ))}
          {resumo?.academia.length === 0 && <p className="text-text-tertiary">Nenhuma adesão.</p>}
        </ul>
        {!showAcademiaForm ? (
          <Button variant="secondary" className="self-start" onClick={() => setShowAcademiaForm(true)}>
            Adicionar adesão
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              addAcademia.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Convênio</span>
              <select
                value={convenioId}
                onChange={(ev) => setConvenioId(ev.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {convenios?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <input type="date" value={dataAdesaoAcademia} onChange={(ev) => setDataAdesaoAcademia(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <Button type="submit" disabled={addAcademia.isPending}>
              Adicionar
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAcademiaForm(false)}>
              Cancelar
            </Button>
          </form>
        )}
      </Section>

      <Section title="Plano de saúde">
        <div className="flex flex-col gap-3">
          {resumo?.planoSaude.map((s) => (
            <div key={s.id} className="rounded-[10px] border border-border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {s.plano.nome} · desde {formatDate(s.dataAdesao)}
                  {s.dataCancelamento && ` até ${formatDate(s.dataCancelamento)}`}
                </span>
                {!s.dataCancelamento ? (
                  <button onClick={() => cancelSaude.mutate(s.id)} className="text-xs text-danger hover:underline">
                    cancelar adesão
                  </button>
                ) : (
                  <span className="text-xs text-text-tertiary">encerrado</span>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1 pl-3 text-xs text-text-secondary">
                {s.dependentes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span>
                      {d.nome} · {d.parentesco ?? '—'} · {formatDate(d.dataNascimento)}
                    </span>
                    <button onClick={() => removeDependente.mutate({ adesaoId: s.id, dependenteId: d.id })} className="text-danger hover:underline">
                      remover
                    </button>
                  </div>
                ))}
              </div>
              {depFormAdesaoId === s.id ? (
                <form
                  className="mt-2 flex flex-wrap items-end gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    addDependente.mutate(s.id);
                  }}
                >
                  <input placeholder="Nome" value={depNome} onChange={(ev) => setDepNome(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs" />
                  <input type="date" value={depDataNascimento} onChange={(ev) => setDepDataNascimento(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs" />
                  <input placeholder="Parentesco" value={depParentesco} onChange={(ev) => setDepParentesco(ev.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-xs" />
                  <Button type="submit" variant="secondary" disabled={addDependente.isPending}>
                    Adicionar
                  </Button>
                </form>
              ) : (
                <button onClick={() => setDepFormAdesaoId(s.id)} className="mt-2 text-xs text-accent hover:underline">
                  + dependente no plano
                </button>
              )}
            </div>
          ))}
          {resumo?.planoSaude.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma adesão.</p>}
        </div>
        {!showSaudeForm ? (
          <Button variant="secondary" className="self-start" onClick={() => setShowSaudeForm(true)}>
            Adicionar adesão
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              addSaude.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Plano</span>
              <select
                value={planoId}
                onChange={(ev) => setPlanoId(ev.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {planos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <input type="date" value={dataAdesaoSaude} onChange={(ev) => setDataAdesaoSaude(ev.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <Button type="submit" disabled={addSaude.isPending}>
              Adicionar
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowSaudeForm(false)}>
              Cancelar
            </Button>
          </form>
        )}
      </Section>
    </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
      />
    </label>
  );
}
