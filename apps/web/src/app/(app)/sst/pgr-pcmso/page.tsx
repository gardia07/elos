'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface PgrAction {
  id: string;
  acao: string;
  setor: string;
  prazo: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  atrasada: boolean;
}
interface PcmsoUpcoming {
  nome: string;
  tipo: string;
  diasRestantes: number;
}

const STATUS_LABEL = { PLANEJADA: 'Planejada', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída' } as const;

export default function PgrPcmsoPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [acao, setAcao] = useState('');
  const [setor, setSetor] = useState('');
  const [prazo, setPrazo] = useState('');

  const { data: actions } = useQuery({
    queryKey: ['sst', 'pgr', 'actions'],
    queryFn: async () => (await api.get<PgrAction[]>('/sst/pgr/actions')).data,
  });
  const { data: pcmso } = useQuery({
    queryKey: ['sst', 'pgr', 'pcmso-upcoming'],
    queryFn: async () => (await api.get<PcmsoUpcoming[]>('/sst/pgr/pcmso-upcoming')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sst', 'pgr'] });

  const create = useMutation({
    mutationFn: async () => api.post('/sst/pgr/actions', { acao, setor, prazo }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setAcao('');
      setSetor('');
      setPrazo('');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: { id: string; status: PgrAction['status'] }) => api.patch(`/sst/pgr/actions/${vars.id}`, { status: vars.status }),
    onSuccess: invalidate,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">PGR — ações corretivas</h3>
          <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancelar' : 'Nova ação'}
          </Button>
        </div>

        {showForm && (
          <form
            className="mb-4 flex flex-col gap-2 rounded-[10px] border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <input value={acao} onChange={(e) => setAcao(e.target.value)} placeholder="Ação" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Setor" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm" />
            <Button type="submit" disabled={create.isPending} className="self-start">
              Salvar
            </Button>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {actions?.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-[10px] border border-border p-2.5 text-sm">
              <div>
                <div className="font-medium">{a.acao}</div>
                <div className="text-xs text-text-tertiary">
                  {a.setor} · prazo {new Date(a.prazo).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <select
                value={a.status}
                onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value as PgrAction['status'] })}
                className="rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs"
              >
                <option value="PLANEJADA">Planejada</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CONCLUIDA">Concluída</option>
              </select>
            </li>
          ))}
          {actions?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma ação cadastrada.</p>}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">PCMSO — exames a vencer</h3>
        <ul className="flex flex-col gap-2">
          {pcmso?.map((e, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span>
                {e.nome} — {e.tipo}
              </span>
              <Badge tone={e.diasRestantes < 0 ? 'red' : 'amber'}>{e.diasRestantes < 0 ? 'atrasado' : `em ${e.diasRestantes} dias`}</Badge>
            </li>
          ))}
          {pcmso?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum exame vencendo nos próximos 15 dias.</p>}
        </ul>
      </Card>
    </div>
  );
}
