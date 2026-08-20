'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { Badge, Button, Card, Drawer, EmptyState, KpiCard } from '@/components/ui';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

type StatusPeriodoAquisitivo = 'EM_AQUISICAO' | 'DISPONIVEL' | 'A_VENCER' | 'VENCIDA' | 'PARCIALMENTE_GOZADA' | 'QUITADA' | 'PERDIDO_POR_AFASTAMENTO';
type StatusFracaoFerias = 'PENDENTE' | 'APROVADA' | 'REPROVADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

const STATUS_PERIODO_LABEL: Record<StatusPeriodoAquisitivo, string> = {
  EM_AQUISICAO: 'Em aquisição',
  DISPONIVEL: 'Disponível',
  A_VENCER: 'A vencer',
  VENCIDA: 'Vencida',
  PARCIALMENTE_GOZADA: 'Parcialmente gozada',
  QUITADA: 'Quitada',
  PERDIDO_POR_AFASTAMENTO: 'Perdeu o direito (afastamento)',
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

const STATUS_PERIODO_DOT: Record<StatusPeriodoAquisitivo, string> = {
  EM_AQUISICAO: 'bg-text-tertiary',
  DISPONIVEL: 'bg-success',
  A_VENCER: 'bg-warning',
  VENCIDA: 'bg-danger',
  PARCIALMENTE_GOZADA: 'bg-accent',
  QUITADA: 'bg-text-tertiary',
  PERDIDO_POR_AFASTAMENTO: 'bg-danger',
};

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

interface VisaoGeral {
  emFeriasHoje: { id: string; nome: string; filial: string | null; retorno: string }[];
  pendentesAprovacao: number;
  periodosVencidos: number;
  exposicaoFinanceiraEstimada: number;
  aVencer30Dias: number;
  aVencer60Dias: number;
  aVencer90Dias: number;
  saldoMedio: number;
  distribuicao: { vencida: number; aVencer: number; dentroDoPrazo: number };
}

interface PeriodoItem {
  periodoId: string;
  employeeId: string;
  nome: string;
  filial: string | null;
  resumo: {
    dataInicio: string;
    dataFim: string;
    dataLimiteConcessao: string;
    diasAdquiridos: number;
    diasGozados: number;
    saldoDisponivel: number;
    status: StatusPeriodoAquisitivo;
    diasParaVencer: number | null;
  };
  exposicaoEstimada: number | null;
}

interface FracaoItem {
  id: string;
  employeeId: string;
  nome: string;
  filial: string | null;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: StatusFracaoFerias;
}

interface FilterOptions {
  filiais: string[];
}

interface EmployeeOption {
  id: string;
  nome: string;
  filial: string | null;
  dataAdmissao: string;
}

interface PeriodoParaProgramar {
  id: string;
  dataInicio: string;
  dataFim: string;
  resumo: { saldoDisponivel: number; status: StatusPeriodoAquisitivo; diasParaVencer: number | null };
}

interface HistoricoColaborador {
  employee: { nome: string; filial: string | null; dataAdmissao: string };
  periodos: {
    id: string;
    numero: number;
    dataInicio: string;
    dataFim: string;
    resumo: {
      dataLimiteConcessao: string;
      diasAdquiridos: number;
      diasGozados: number;
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
      statusEfetivo: StatusFracaoFerias;
      documentos: { id: string; nome: string }[];
    }[];
  }[];
}

const TABS = [
  { key: 'VISAO', label: 'Visão geral', kind: undefined, status: undefined },
  { key: 'VENCIDAS', label: 'Vencidas', kind: 'periodo', status: 'VENCIDA' },
  { key: 'A_VENCER', label: 'A vencer', kind: 'periodo', status: 'A_VENCER' },
  { key: 'PENDENTES', label: 'Pendentes', kind: 'fracao', status: 'PENDENTES' },
  { key: 'APROVADAS', label: 'Aprovadas', kind: 'fracao', status: 'APROVADAS' },
  { key: 'EM_FERIAS', label: 'Em férias', kind: 'fracao', status: 'EM_FERIAS' },
  { key: 'HISTORICO', label: 'Histórico', kind: undefined, status: undefined },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function FeriasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('VISAO');
  const [nome, setNome] = useState('');
  const [filial, setFilial] = useState('');
  const [histEmployeeId, setHistEmployeeId] = useState('');

  const [showProgramar, setShowProgramar] = useState(false);
  const [progEmployeeId, setProgEmployeeId] = useState('');
  const [progPeriodoId, setProgPeriodoId] = useState('');
  const [progPeriodoAlvo, setProgPeriodoAlvo] = useState<string | null>(null);
  const [progInicio, setProgInicio] = useState('');
  const [progDias, setProgDias] = useState('');
  const [venderDias, setVenderDias] = useState(false);
  const [progDiasAbono, setProgDiasAbono] = useState('');
  const [progAntecipa13, setProgAntecipa13] = useState(false);
  const [progColetiva, setProgColetiva] = useState(false);
  const [progJustificativa, setProgJustificativa] = useState('');
  const [programarError, setProgramarError] = useState('');

  const { data: visaoGeral } = useQuery({
    queryKey: ['rh', 'ferias', 'visao-geral'],
    queryFn: async () => (await api.get<VisaoGeral>('/rh/ferias/visao-geral')).data,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['rh', 'employees', 'filter-options'],
    queryFn: async () => (await api.get<FilterOptions>('/rh/employees/filter-options')).data,
  });

  const tabConfig = TABS.find((t) => t.key === tab)!;

  const { data: periodos } = useQuery({
    queryKey: ['rh', 'ferias', 'periodos', tabConfig.status, nome, filial],
    queryFn: async () =>
      (await api.get<PeriodoItem[]>('/rh/ferias/periodos', { params: { status: tabConfig.status, nome: nome || undefined, filial: filial || undefined } })).data,
    enabled: tabConfig.kind === 'periodo',
  });

  const { data: fracoes } = useQuery({
    queryKey: ['rh', 'ferias', 'fracoes', tabConfig.status, nome, filial],
    queryFn: async () =>
      (await api.get<FracaoItem[]>('/rh/ferias/fracoes', { params: { statusFracao: tabConfig.status, nome: nome || undefined, filial: filial || undefined } })).data,
    enabled: tabConfig.kind === 'fracao',
  });

  const { data: employees } = useQuery({
    queryKey: ['rh', 'employees', 'all'],
    queryFn: async () => (await api.get<EmployeeOption[]>('/rh/employees')).data,
    enabled: showProgramar || tab === 'HISTORICO',
  });

  const { data: historico } = useQuery({
    queryKey: ['rh', 'ferias', 'historico', histEmployeeId],
    queryFn: async () => (await api.get<HistoricoColaborador>(`/rh/ferias/colaboradores/${histEmployeeId}/historico`)).data,
    enabled: tab === 'HISTORICO' && !!histEmployeeId,
  });

  const { data: periodosParaProgramar } = useQuery({
    queryKey: ['rh', 'ferias', 'historico-periodos', progEmployeeId],
    queryFn: async () => (await api.get<{ periodos: PeriodoParaProgramar[] }>(`/rh/ferias/colaboradores/${progEmployeeId}/historico`)).data.periodos,
    enabled: showProgramar && !!progEmployeeId,
  });

  // quando o período-alvo (vindo de um clique em "Programar" numa linha) chega junto com a lista, seleciona automaticamente
  useEffect(() => {
    if (progPeriodoAlvo && periodosParaProgramar?.some((p) => p.id === progPeriodoAlvo)) {
      setProgPeriodoId(progPeriodoAlvo);
      setProgPeriodoAlvo(null);
    }
  }, [progPeriodoAlvo, periodosParaProgramar]);

  const { data: alertasPreview } = useQuery({
    queryKey: ['rh', 'ferias', 'preview-alertas', progPeriodoId, progInicio, progDias, progDiasAbono],
    queryFn: async () =>
      (
        await api.get<{ alertas: string[]; saldoDisponivel: number }>(`/rh/ferias/periodos/${progPeriodoId}/preview-alertas`, {
          params: { dataInicio: progInicio || undefined, dias: progDias || undefined, diasAbono: progDiasAbono || undefined },
        })
      ).data,
    enabled: showProgramar && !!progPeriodoId,
  });

  const resetProgramarForm = () => {
    setProgEmployeeId('');
    setProgPeriodoId('');
    setProgPeriodoAlvo(null);
    setProgInicio('');
    setProgDias('');
    setVenderDias(false);
    setProgDiasAbono('');
    setProgAntecipa13(false);
    setProgColetiva(false);
    setProgJustificativa('');
    setProgramarError('');
  };

  const abrirProgramar = (employeeId: string, periodoId?: string) => {
    resetProgramarForm();
    setProgEmployeeId(employeeId);
    if (periodoId) setProgPeriodoAlvo(periodoId);
    setShowProgramar(true);
  };

  const programarFerias = useMutation({
    mutationFn: async () =>
      api.post(`/rh/ferias/colaboradores/${progEmployeeId}/programar`, {
        periodoAquisitivoId: progPeriodoId,
        tipo: progColetiva ? 'COLETIVA' : 'NORMAL',
        dataInicio: progInicio,
        dias: Number(progDias),
        diasAbono: venderDias && progDiasAbono ? Number(progDiasAbono) : undefined,
        antecipa13: progAntecipa13 || undefined,
        justificativa: progJustificativa || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
      setShowProgramar(false);
      resetProgramarForm();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setProgramarError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível programar as férias.');
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
  const aprovar = useMutation({
    mutationFn: async (id: string) => api.patch(`/rh/ferias/fracoes/${id}/aprovar`),
    onSuccess: invalidate,
  });
  const reprovar = useMutation({
    mutationFn: async (id: string) => api.patch(`/rh/ferias/fracoes/${id}/reprovar`, {}),
    onSuccess: invalidate,
  });

  const employeeSelecionado = employees?.find((e) => e.id === progEmployeeId);
  const distribuicaoTotal = visaoGeral ? visaoGeral.distribuicao.vencida + visaoGeral.distribuicao.aVencer + visaoGeral.distribuicao.dentroDoPrazo : 0;

  const donutR = 60;
  const donutStroke = 18;
  const donutC = 2 * Math.PI * donutR;
  const donutSegmentos = visaoGeral
    ? [
        { valor: visaoGeral.distribuicao.vencida, className: 'text-danger' },
        { valor: visaoGeral.distribuicao.aVencer, className: 'text-warning' },
        { valor: visaoGeral.distribuicao.dentroDoPrazo, className: 'text-success' },
      ]
    : [];
  let donutOffsetAcumulado = 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Férias</h2>
          <p className="text-sm text-text-secondary">Controle por período aquisitivo — histórico completo desde a admissão.</p>
        </div>
        <Button onClick={() => abrirProgramar('')}>+ Programar férias</Button>
      </div>

      <Drawer
        open={showProgramar}
        onClose={() => {
          setShowProgramar(false);
          resetProgramarForm();
        }}
        title="Programar férias"
      >
        <form
          className="flex flex-col items-start gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            programarFerias.mutate();
          }}
        >
          <label className="flex w-full flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Colaborador</span>
            <select
              value={progEmployeeId}
              onChange={(ev) => {
                setProgEmployeeId(ev.target.value);
                setProgPeriodoId('');
              }}
              required
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            >
              <option value="">Selecione…</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>

          {employeeSelecionado && (
            <div className="flex w-full items-center gap-3 rounded-[10px] bg-surface-alt p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent">
                {initials(employeeSelecionado.nome)}
              </div>
              <div className="text-sm">
                <div className="font-medium">{employeeSelecionado.nome}</div>
                <div className="text-xs text-text-tertiary">
                  {employeeSelecionado.filial ?? '—'} · Admissão em {formatDate(employeeSelecionado.dataAdmissao)}
                </div>
              </div>
            </div>
          )}

          <label className="flex w-full flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Período aquisitivo</span>
            <select
              value={progPeriodoId}
              onChange={(ev) => setProgPeriodoId(ev.target.value)}
              required
              disabled={!progEmployeeId}
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            >
              <option value="">Selecione…</option>
              {(periodosParaProgramar ?? [])
                .filter((p) => p.resumo.saldoDisponivel > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.dataInicio)} – {formatDate(p.dataFim)}
                    {p.resumo.status === 'VENCIDA' && p.resumo.diasParaVencer != null ? ` · vencida há ${Math.abs(p.resumo.diasParaVencer)} dias` : ''} · saldo{' '}
                    {p.resumo.saldoDisponivel}
                  </option>
                ))}
            </select>
          </label>

          {alertasPreview && alertasPreview.alertas.length > 0 && (
            <div className="w-full rounded-[10px] border border-warning bg-warning-bg p-3 text-xs text-warning">
              <b>Atenção — </b>
              {alertasPreview.alertas.join(' ')}
            </div>
          )}

          <div className="grid w-full grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data de início</span>
              <input type="date" value={progInicio} onChange={(ev) => setProgInicio(ev.target.value)} required className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Quantidade de dias</span>
              <input
                type="number"
                min={1}
                value={progDias}
                onChange={(ev) => setProgDias(ev.target.value)}
                required
                className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={venderDias} onChange={(ev) => setVenderDias(ev.target.checked)} />
            <span className="text-text-secondary">Vender alguns dias? (abono pecuniário, até 10 dias)</span>
          </label>
          {venderDias && (
            <input
              type="number"
              min={0}
              max={10}
              value={progDiasAbono}
              onChange={(ev) => setProgDiasAbono(ev.target.value)}
              placeholder="Dias de abono"
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={progAntecipa13} onChange={(ev) => setProgAntecipa13(ev.target.checked)} />
            <span className="text-text-secondary">Solicitar antecipação da 1ª parcela do 13º</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={progColetiva} onChange={(ev) => setProgColetiva(ev.target.checked)} />
            <span className="text-text-secondary">Fração de férias coletivas</span>
          </label>

          <label className="flex w-full flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Justificativa</span>
            <textarea
              rows={3}
              value={progJustificativa}
              onChange={(ev) => setProgJustificativa(ev.target.value)}
              placeholder="Obrigatória para solicitações fora da janela recomendada"
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>

          <p className="text-xs text-text-tertiary">Aviso de férias gerado automaticamente ao programar — precisa de 30 dias de antecedência até o início.</p>

          <Button type="submit" disabled={programarFerias.isPending}>
            Programar férias
          </Button>
          {programarError && <p className="text-xs text-danger">{programarError}</p>}
        </form>
      </Drawer>

      <div className="flex flex-wrap gap-1 border-b border-divider">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${tab === t.key ? 'border-b-2 border-accent font-medium text-text' : 'text-text-secondary'}`}
          >
            {t.label}
            {t.key === 'VENCIDAS' && !!visaoGeral?.periodosVencidos && <Badge tone="red">{visaoGeral.periodosVencidos}</Badge>}
            {t.key === 'A_VENCER' && !!visaoGeral?.distribuicao.aVencer && <Badge tone="amber">{visaoGeral.distribuicao.aVencer}</Badge>}
            {t.key === 'PENDENTES' && !!visaoGeral?.pendentesAprovacao && <Badge tone="amber">{visaoGeral.pendentesAprovacao}</Badge>}
          </button>
        ))}
      </div>

      {tab === 'VISAO' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Em férias hoje" value={visaoGeral?.emFeriasHoje.length ?? 0} />
            <KpiCard label="Pendentes de aprovação" value={visaoGeral?.pendentesAprovacao ?? 0} />
            <KpiCard label="Períodos vencidos" value={<span className="text-danger">{visaoGeral?.periodosVencidos ?? 0}</span>} />
            <KpiCard label="Exposição financeira estimada" value={formatBRL(visaoGeral?.exposicaoFinanceiraEstimada ?? 0)} />
            <KpiCard label="A vencer em 60 dias" value={visaoGeral?.aVencer60Dias ?? 0} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Períodos aquisitivos por status</h3>
              {distribuicaoTotal > 0 && visaoGeral ? (
                <div className="flex items-center gap-6">
                  <div className="relative h-[140px] w-[140px] shrink-0">
                    <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
                      <circle cx={70} cy={70} r={donutR} fill="none" stroke="currentColor" strokeWidth={donutStroke} className="text-surface-alt" />
                      {donutSegmentos.map((seg, i) => {
                        if (seg.valor === 0) return null;
                        const comprimento = (seg.valor / distribuicaoTotal) * donutC;
                        const offset = donutOffsetAcumulado;
                        donutOffsetAcumulado += comprimento;
                        return (
                          <circle
                            key={i}
                            cx={70}
                            cy={70}
                            r={donutR}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={donutStroke}
                            strokeDasharray={`${comprimento} ${donutC - comprimento}`}
                            strokeDashoffset={-offset}
                            className={seg.className}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold">{distribuicaoTotal}</span>
                      <span className="text-[11px] text-text-tertiary">períodos ativos</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Vencida
                      <span className="ml-auto font-semibold">{visaoGeral.distribuicao.vencida}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> A vencer
                      <span className="ml-auto font-semibold">{visaoGeral.distribuicao.aVencer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Dentro do prazo
                      <span className="ml-auto font-semibold">{visaoGeral.distribuicao.dentroDoPrazo}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState>Sem períodos ativos.</EmptyState>
              )}
              <p className="mt-3 text-xs text-text-tertiary">Cada fatia é um período aquisitivo — não um colaborador. Um mesmo colaborador pode ter mais de um período.</p>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold">Quem está de férias hoje</h3>
              {visaoGeral?.emFeriasHoje.length === 0 && <EmptyState>Ninguém de férias hoje.</EmptyState>}
              <div className="flex flex-col gap-2.5">
                {visaoGeral?.emFeriasHoje.map((f) => (
                  <div
                    key={f.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-divider py-2 last:border-0"
                    onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${f.id}`)}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-on-accent">
                      {initials(f.nome)}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{f.nome}</div>
                      <div className="text-xs text-text-tertiary">volta em {formatDate(f.retorno)}</div>
                    </div>
                    <span className="ml-auto rounded-full bg-surface-alt px-2.5 py-1 text-xs text-text-secondary">{f.filial ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {(tabConfig.kind === 'periodo' || tabConfig.kind === 'fracao') && (
        <div className="flex flex-wrap gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Buscar colaborador…"
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <select value={filial} onChange={(e) => setFilial(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm">
            <option value="">Todas as filiais</option>
            {filterOptions?.filiais.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      )}

      {tabConfig.kind === 'periodo' && (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-text-tertiary">
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Vencimento</th>
                <th className="px-5 py-3 font-medium">Período aquisitivo</th>
                <th className="px-5 py-3 font-medium">{tab === 'VENCIDAS' ? 'Saldo / Exposição' : 'Saldo disponível'}</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {periodos?.map((p) => (
                <tr key={p.periodoId} className="border-b border-divider last:border-0 hover:bg-surface-alt">
                  <td className="cursor-pointer px-5 py-3" onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${p.employeeId}`)}>
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-xs text-text-tertiary">{p.filial ?? '—'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_PERIODO_TONE[p.resumo.status]}>{STATUS_PERIODO_LABEL[p.resumo.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(p.resumo.dataLimiteConcessao)}
                    {p.resumo.diasParaVencer != null && (
                      <div className="text-xs text-text-tertiary">
                        {p.resumo.diasParaVencer < 0 ? `vencida há ${Math.abs(p.resumo.diasParaVencer)} dias` : `vence em ${p.resumo.diasParaVencer} dias`}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(p.resumo.dataInicio)} a {formatDate(p.resumo.dataFim)}
                    <div className="text-xs text-text-tertiary">{p.resumo.diasAdquiridos} dias adquiridos</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold">{p.resumo.saldoDisponivel} dias</div>
                    {p.exposicaoEstimada != null && <div className="text-xs text-danger">≈ {formatBRL(p.exposicaoEstimada)} em dobro</div>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="secondary" onClick={() => abrirProgramar(p.employeeId, p.periodoId)}>
                      Programar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {periodos?.length === 0 && <EmptyState>Nenhum período nessa situação.</EmptyState>}
        </Card>
      )}

      {tabConfig.kind === 'fracao' && (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-text-tertiary">
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Período</th>
                <th className="px-5 py-3 font-medium">{tab === 'EM_FERIAS' ? 'Retorno' : 'Dias'}</th>
                <th className="px-5 py-3 font-medium">Filial</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {fracoes?.map((f) => (
                <tr key={f.id} className="border-b border-divider last:border-0 hover:bg-surface-alt">
                  <td className="cursor-pointer px-5 py-3 font-medium" onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${f.employeeId}`)}>
                    {f.nome}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_FRACAO_TONE[f.status]}>{STATUS_FRACAO_LABEL[f.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(f.dataInicio)} a {formatDate(f.dataFim)}
                  </td>
                  <td className="px-5 py-3">{tab === 'EM_FERIAS' ? formatDate(f.dataFim) : `${f.dias} dias`}</td>
                  <td className="px-5 py-3 text-text-secondary">{f.filial ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {f.status === 'PENDENTE' && (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => aprovar.mutate(f.id)}>Aprovar</Button>
                        <Button variant="secondary" onClick={() => reprovar.mutate(f.id)}>
                          Reprovar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fracoes?.length === 0 && <EmptyState>Nenhum registro nessa situação.</EmptyState>}
        </Card>
      )}

      {tab === 'HISTORICO' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <select
              value={histEmployeeId}
              onChange={(ev) => setHistEmployeeId(ev.target.value)}
              className="min-w-[280px] rounded-[10px] border border-border-strong bg-surface px-3 py-2.5 text-sm"
            >
              <option value="">Selecione um colaborador…</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            {historico && (
              <span className="text-sm text-text-tertiary">
                Admissão em {formatDate(historico.employee.dataAdmissao)} · {historico.employee.filial ?? '—'}
              </span>
            )}
          </div>

          {!histEmployeeId && <EmptyState>Selecione um colaborador para ver a linha do tempo completa de férias.</EmptyState>}

          {historico && (
            <div className="relative flex flex-col gap-3.5 pl-6">
              <div className="absolute bottom-1.5 left-[9px] top-1.5 w-px bg-divider" />
              {historico.periodos.map((p) => (
                <div key={p.id} className="relative">
                  <span className={`absolute -left-6 top-5 h-3 w-3 rounded-full border-2 border-page-bg ${STATUS_PERIODO_DOT[p.resumo.status]}`} />
                  <details className="rounded-[10px] border border-border bg-surface" open={p.resumo.status === 'VENCIDA' || p.resumo.status === 'A_VENCER'}>
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                      <div>
                        <div className="text-sm font-semibold">
                          {formatDate(p.dataInicio)} — {p.resumo.status === 'EM_AQUISICAO' ? 'em curso' : formatDate(p.dataFim)}
                        </div>
                        <div className="text-xs text-text-tertiary">{p.numero}º período aquisitivo</div>
                      </div>
                      {p.resumo.status !== 'EM_AQUISICAO' ? (
                        <div className="ml-4 flex gap-5 text-xs text-text-secondary">
                          <span>
                            Adquiridos
                            <br />
                            <b className="text-sm text-text">{p.resumo.diasAdquiridos}</b>
                          </span>
                          <span>
                            Gozados
                            <br />
                            <b className="text-sm text-text">{p.resumo.diasGozados}</b>
                          </span>
                          <span>
                            Saldo
                            <br />
                            <b className="text-sm text-text">{p.resumo.saldoDisponivel}</b>
                          </span>
                        </div>
                      ) : (
                        <span className="ml-4 text-xs text-text-tertiary">Direito ainda não exigível</span>
                      )}
                      <Badge tone={STATUS_PERIODO_TONE[p.resumo.status]}>
                        {p.resumo.status === 'VENCIDA' && p.resumo.diasParaVencer != null
                          ? `Vencida há ${Math.abs(p.resumo.diasParaVencer)} dias`
                          : STATUS_PERIODO_LABEL[p.resumo.status]}
                      </Badge>
                    </summary>
                    <div className="flex flex-col gap-2 border-t border-divider px-4 pb-4 pt-3">
                      {p.fracoes.length === 0 &&
                        (p.resumo.status === 'EM_AQUISICAO' ? (
                          <p className="text-xs text-text-tertiary">Direito ainda não exigível — fecha em {formatDate(p.resumo.dataLimiteConcessao)}.</p>
                        ) : p.resumo.status === 'VENCIDA' ? (
                          <p className="text-xs text-text-tertiary">
                            Nenhuma fração programada — concessivo expirou em {formatDate(p.resumo.dataLimiteConcessao)}, sujeito a pagamento em dobro (Súmula 81 TST).
                          </p>
                        ) : (
                          <p className="text-xs text-text-tertiary">Nenhuma fração programada.</p>
                        ))}
                      {p.fracoes.map((f) => (
                        <div key={f.id} className="flex flex-wrap items-center gap-3 border-b border-dashed border-divider py-2 text-sm last:border-0">
                          <span className="min-w-[130px] font-medium">{f.tipo === 'COLETIVA' ? 'Férias coletivas' : 'Férias normais'}</span>
                          <span className="text-text-secondary">
                            {formatDate(f.dataInicio)} a {formatDate(f.dataFim)} · {f.dias} dias
                            {f.diasAbono > 0 ? ` · ${f.diasAbono}d abono` : ''}
                          </span>
                          <Badge tone={STATUS_FRACAO_TONE[f.statusEfetivo]}>{STATUS_FRACAO_LABEL[f.statusEfetivo]}</Badge>
                          <div className="ml-auto flex gap-3">
                            {f.documentos.map((d) => (
                              <a
                                key={d.id}
                                href={`${apiBaseUrl}/rh/employees/${histEmployeeId}/documentos/${d.id}/arquivo`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent hover:underline"
                              >
                                {d.nome}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
