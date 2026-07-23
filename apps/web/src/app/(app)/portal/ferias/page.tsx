'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface VacationRequest {
  id: string;
  inicio: string;
  fim: string;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  createdAt: string;
}

const STATUS_LABEL = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', RECUSADA: 'Recusada' } as const;
const STATUS_TONE = { PENDENTE: 'amber', APROVADA: 'green', RECUSADA: 'red' } as const;

export default function PortalFeriasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const { data: requests } = useQuery({
    queryKey: ['portal', 'ferias'],
    queryFn: async () => (await api.get<VacationRequest[]>('/portal/ferias')).data,
    retry: false,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/portal/ferias', { inicio, fim }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'ferias'] });
      setShowForm(false);
      setInicio('');
      setFim('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Solicitar férias'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Início</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Fim</span>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Enviar solicitação
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Início</th>
              <th className="px-5 py-3 font-medium">Fim</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests?.map((r) => (
              <tr key={r.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3">{new Date(r.inicio).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3">{new Date(r.fim).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma solicitação ainda.</p>}
      </Card>
    </div>
  );
}
