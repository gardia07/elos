'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Deadline {
  id: string;
  obrigacao: string;
  vencimento: string;
  cumprido: boolean;
  status: 'Cumprido' | 'Pendente' | 'Em dia';
}

const STATUS_TONE = { Cumprido: 'grey', Pendente: 'red', 'Em dia': 'green' } as const;

export default function PrazosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [obrigacao, setObrigacao] = useState('');
  const [vencimento, setVencimento] = useState('');

  const { data } = useQuery({
    queryKey: ['dp', 'deadlines'],
    queryFn: async () => (await api.get<Deadline[]>('/dp/deadlines')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/deadlines', { obrigacao, vencimento }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'deadlines'] });
      setShowForm(false);
      setObrigacao('');
      setVencimento('');
    },
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => api.patch(`/dp/deadlines/${id}`, { cumprido: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dp', 'deadlines'] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova obrigação'}</Button>
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
              <span className="text-text-secondary">Obrigação</span>
              <input value={obrigacao} onChange={(e) => setObrigacao(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Vencimento</span>
              <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Adicionar
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-tertiary">
              <th className="pb-2">Obrigação</th>
              <th className="pb-2">Vencimento</th>
              <th className="pb-2">Status</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.id} className="border-t border-divider">
                <td className="py-2">{d.obrigacao}</td>
                <td className="py-2 text-text-secondary">{new Date(d.vencimento).toLocaleDateString('pt-BR')}</td>
                <td className="py-2">
                  <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                </td>
                <td className="py-2 text-right">
                  {!d.cumprido && (
                    <Button variant="secondary" onClick={() => markDone.mutate(d.id)}>
                      Marcar cumprido
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
