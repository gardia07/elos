'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Run {
  id: string;
  competencia: string;
  status: 'ABERTO' | 'PROCESSADA';
  esocialSent: boolean;
  _count: { items: number };
}

export default function FolhaPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [competencia, setCompetencia] = useState('');

  const { data: runs } = useQuery({
    queryKey: ['dp', 'payroll', 'runs'],
    queryFn: async () => (await api.get<Run[]>('/dp/payroll/runs')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/payroll/runs', { competencia }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'payroll', 'runs'] });
      setShowForm(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova competência'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Competência (AAAA-MM)</span>
              <input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="2026-08"
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Abrir folha
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {runs?.map((r) => (
          <Link key={r.id} href={`/dp/folha/${r.id}`}>
            <Card className="flex items-center justify-between hover:border-accent">
              <div>
                <div className="font-medium">Competência {r.competencia}</div>
                <div className="text-sm text-text-secondary">{r._count.items} holerite(s)</div>
              </div>
              <div className="flex items-center gap-2">
                {r.esocialSent && <Badge tone="blue">eSocial enviado</Badge>}
                <Badge tone={r.status === 'PROCESSADA' ? 'green' : 'amber'}>
                  {r.status === 'PROCESSADA' ? 'Processada' : 'Em aberto'}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
