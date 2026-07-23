'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, KpiCard } from '@/components/ui';

interface Cycle {
  id: string;
  nome: string;
  modelo: 'NOVENTA' | 'CENTO_OITENTA' | 'TRESSESSENTA';
}

interface RecordRow {
  employeeId: string;
  nome: string;
  departamento: string;
  autoNota: number | null;
  gestorNota: number | null;
  status: string;
}

interface Summary {
  concluidas: number;
  total: number;
  pctConcluidas: number;
  notaMedia: number;
  progresso: number;
  notaPorDepto: { departamento: string; nota: number; pct: number }[];
}

export default function AvaliacaoPage() {
  const queryClient = useQueryClient();
  const [cycleId, setCycleId] = useState<string>('');
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [nome, setNome] = useState('2026.2');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  const { data: cycles } = useQuery({
    queryKey: ['evaluations', 'cycles'],
    queryFn: async () => (await api.get<Cycle[]>('/rh/evaluations/cycles')).data,
  });

  useEffect(() => {
    if (!cycleId && cycles && cycles.length > 0) setCycleId(cycles[0].id);
  }, [cycles, cycleId]);

  const { data: records } = useQuery({
    queryKey: ['evaluations', 'records', cycleId],
    queryFn: async () => (await api.get<RecordRow[]>(`/rh/evaluations/cycles/${cycleId}/records`)).data,
    enabled: !!cycleId,
  });

  const { data: summary } = useQuery({
    queryKey: ['evaluations', 'summary', cycleId],
    queryFn: async () => (await api.get<Summary>(`/rh/evaluations/cycles/${cycleId}/summary`)).data,
    enabled: !!cycleId,
  });

  const createCycle = useMutation({
    mutationFn: async () =>
      api.post('/rh/evaluations/cycles', { nome, periodoInicio, periodoFim, modelo: 'NOVENTA' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'cycles'] });
      setShowNewCycle(false);
    },
  });

  const upsertRecord = useMutation({
    mutationFn: async (vars: { employeeId: string; gestorNota: number }) =>
      api.put(`/rh/evaluations/cycles/${cycleId}/records/${vars.employeeId}`, { gestorNota: vars.gestorNota }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'records', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'summary', cycleId] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {cycles?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCycleId(c.id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              cycleId === c.id ? 'border-accent bg-accent text-on-accent' : 'border-border-strong bg-surface'
            }`}
          >
            {c.nome}
          </button>
        ))}
        <Button variant="secondary" onClick={() => setShowNewCycle((s) => !s)}>
          {showNewCycle ? 'Cancelar' : 'Novo ciclo'}
        </Button>
      </div>

      {showNewCycle && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createCycle.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Início</span>
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Fim</span>
              <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit">Criar ciclo</Button>
          </form>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Concluídas" value={`${summary.pctConcluidas}%`} />
          <KpiCard label="Nota média" value={summary.notaMedia} />
          <KpiCard label="Progresso (auto-avaliação)" value={`${summary.progresso}%`} />
          <KpiCard label="Total avaliados" value={summary.total} />
        </div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-tertiary">
              <th className="pb-2">Colaborador</th>
              <th className="pb-2">Depto</th>
              <th className="pb-2">Auto</th>
              <th className="pb-2">Gestor</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {records?.map((r) => (
              <tr key={r.employeeId} className="border-t border-divider">
                <td className="py-2">{r.nome}</td>
                <td className="py-2 text-text-secondary">{r.departamento}</td>
                <td className="py-2">{r.autoNota ?? '—'}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    defaultValue={r.gestorNota ?? ''}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) upsertRecord.mutate({ employeeId: r.employeeId, gestorNota: v });
                    }}
                    className="w-16 rounded-[8px] border border-border-strong bg-surface px-2 py-1"
                  />
                </td>
                <td className="py-2">
                  <Badge tone={r.status === 'Concluída' ? 'green' : 'amber'}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
