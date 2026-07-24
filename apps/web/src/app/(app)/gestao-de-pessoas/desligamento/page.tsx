'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Termination {
  id: string;
  nome: string;
  cargo: string;
  data: string;
  tipo: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO';
  status: 'EM_ANDAMENTO' | 'CONCLUIDO';
}

interface Employee {
  id: string;
  nome: string;
}

const TIPO_LABEL = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
} as const;

export default function DesligamentoPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(!!searchParams.get('employeeId'));
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') ?? '');
  const [tipo, setTipo] = useState<'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO'>('SEM_JUSTA_CAUSA');
  const [data, setData] = useState('');
  const [motivo, setMotivo] = useState('');

  const { data: terminations } = useQuery({
    queryKey: ['terminations'],
    queryFn: async () => (await api.get<Termination[]>('/rh/terminations')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'ativos'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees', { params: { status: 'ATIVO' } })).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/rh/terminations', { employeeId, tipo, data, motivo: motivo || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      setShowForm(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Link href="/cadastros/checklist-desligamento">
          <Button variant="secondary">Configurar checklist</Button>
        </Link>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo desligamento'}</Button>
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
              <span className="text-text-secondary">Colaborador</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="">Selecione…</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="SEM_JUSTA_CAUSA">Sem justa causa</option>
                <option value="PEDIDO_DEMISSAO">Pedido de demissão</option>
                <option value="ACORDO">Acordo (art. 484-A)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Motivo</span>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Iniciar
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {terminations?.map((t) => (
          <Link key={t.id} href={`/gestao-de-pessoas/desligamento/${t.id}`}>
            <Card className="flex items-center justify-between hover:border-accent">
              <div>
                <div className="font-medium">{t.nome}</div>
                <div className="text-sm text-text-secondary">
                  {t.cargo} · {TIPO_LABEL[t.tipo]} · {new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </div>
              </div>
              <Badge tone={t.status === 'CONCLUIDO' ? 'green' : 'amber'}>
                {t.status === 'CONCLUIDO' ? 'Concluído' : 'Em andamento'}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
