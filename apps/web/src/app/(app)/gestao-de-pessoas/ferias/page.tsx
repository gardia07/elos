'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { Badge, Button, Card, EmptyState, KpiCard } from '@/components/ui';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

const TABS = [
  { key: 'VENCIDAS', label: 'Vencidas', kind: 'periodo', status: 'VENCIDA' },
  { key: 'A_VENCER', label: 'A vencer', kind: 'periodo', status: 'A_VENCER' },
  { key: 'PENDENTES', label: 'Pendentes', kind: 'fracao', status: 'PENDENTES' },
  { key: 'APROVADAS', label: 'Aprovadas', kind: 'fracao', status: 'APROVADAS' },
  { key: 'EM_FERIAS', label: 'Em férias', kind: 'fracao', status: 'EM_FERIAS' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function FeriasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('PENDENTES');
  const [nome, setNome] = useState('');
  const [filial, setFilial] = useState('');

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
  const aprovar = useMutation({
    mutationFn: async (id: string) => api.patch(`/rh/ferias/fracoes/${id}/aprovar`),
    onSuccess: invalidate,
  });
  const reprovar = useMutation({
    mutationFn: async (id: string) => api.patch(`/rh/ferias/fracoes/${id}/reprovar`, {}),
    onSuccess: invalidate,
  });

  const distribuicaoTotal = visaoGeral ? visaoGeral.distribuicao.vencida + visaoGeral.distribuicao.aVencer + visaoGeral.distribuicao.dentroDoPrazo : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Em férias hoje" value={visaoGeral?.emFeriasHoje.length ?? 0} />
        <KpiCard label="Pendentes de aprovação" value={visaoGeral?.pendentesAprovacao ?? 0} />
        <KpiCard label="Períodos vencidos" value={visaoGeral?.periodosVencidos ?? 0} />
        <KpiCard label="Exposição financeira estimada" value={formatBRL(visaoGeral?.exposicaoFinanceiraEstimada ?? 0)} />
        <KpiCard label="Saldo médio" value={`${visaoGeral?.saldoMedio ?? 0} dias`} />
      </div>

      {visaoGeral && distribuicaoTotal > 0 && (
        <Card>
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Distribuição dos períodos aquisitivos</span>
            <span>
              {visaoGeral.distribuicao.vencida} vencida(s) · {visaoGeral.distribuicao.aVencer} a vencer · {visaoGeral.distribuicao.dentroDoPrazo} dentro do prazo
            </span>
          </div>
          <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-surface-alt">
            <div className="bg-danger" style={{ width: `${(visaoGeral.distribuicao.vencida / distribuicaoTotal) * 100}%` }} />
            <div className="bg-warning" style={{ width: `${(visaoGeral.distribuicao.aVencer / distribuicaoTotal) * 100}%` }} />
            <div className="bg-success" style={{ width: `${(visaoGeral.distribuicao.dentroDoPrazo / distribuicaoTotal) * 100}%` }} />
          </div>
        </Card>
      )}

      {visaoGeral && visaoGeral.emFeriasHoje.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Quem está de férias hoje</h3>
          <div className="flex flex-wrap gap-2">
            {visaoGeral.emFeriasHoje.map((f) => (
              <Card key={f.id} className="flex flex-col gap-0.5 px-4 py-2.5" onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${f.id}`)}>
                <span className="cursor-pointer text-sm font-medium">{f.nome}</span>
                <span className="text-xs text-text-tertiary">
                  {f.filial ?? '—'} · retorno {formatDate(f.retorno)}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                tab === t.key ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
      </div>

      {tabConfig.kind === 'periodo' ? (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-text-tertiary">
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Filial</th>
                <th className="px-5 py-3 font-medium">Período</th>
                <th className="px-5 py-3 font-medium">Situação</th>
                <th className="px-5 py-3 font-medium">Saldo</th>
                <th className="px-5 py-3 font-medium">Exposição estimada</th>
              </tr>
            </thead>
            <tbody>
              {periodos?.map((p) => (
                <tr
                  key={`${p.employeeId}-${p.resumo.dataInicio}`}
                  className="cursor-pointer border-b border-divider last:border-0 hover:bg-surface-alt"
                  onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${p.employeeId}`)}
                >
                  <td className="px-5 py-3 font-medium">{p.nome}</td>
                  <td className="px-5 py-3 text-text-secondary">{p.filial ?? '—'}</td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(p.resumo.dataInicio)} a {formatDate(p.resumo.dataFim)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={p.resumo.status === 'VENCIDA' ? 'red' : 'amber'}>{STATUS_PERIODO_LABEL[p.resumo.status]}</Badge>
                  </td>
                  <td className="px-5 py-3">{p.resumo.saldoDisponivel} dias</td>
                  <td className="px-5 py-3">{p.exposicaoEstimada != null ? formatBRL(p.exposicaoEstimada) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {periodos?.length === 0 && <EmptyState>Nenhum período nessa situação.</EmptyState>}
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-text-tertiary">
                <th className="px-5 py-3 font-medium">Colaborador</th>
                <th className="px-5 py-3 font-medium">Filial</th>
                <th className="px-5 py-3 font-medium">Período</th>
                <th className="px-5 py-3 font-medium">Dias</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {fracoes?.map((f) => (
                <tr key={f.id} className="border-b border-divider last:border-0 hover:bg-surface-alt">
                  <td className="cursor-pointer px-5 py-3 font-medium" onClick={() => router.push(`/gestao-de-pessoas/colaboradores/${f.employeeId}`)}>
                    {f.nome}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{f.filial ?? '—'}</td>
                  <td className="px-5 py-3 text-text-secondary">
                    {formatDate(f.dataInicio)} a {formatDate(f.dataFim)}
                  </td>
                  <td className="px-5 py-3">{f.dias}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_FRACAO_TONE[f.status]}>{STATUS_FRACAO_LABEL[f.status]}</Badge>
                  </td>
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
    </div>
  );
}
