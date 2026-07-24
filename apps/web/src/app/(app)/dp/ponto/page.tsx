'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, KpiCard } from '@/components/ui';

interface Justification {
  id: string;
  data: string;
  ocorrencia: string;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  employee: { nome: string };
}

interface Kpis {
  pendentes: number;
  aprovadas: number;
  recusadas: number;
}

interface Employee {
  id: string;
  nome: string;
}

const STATUS_TONE = { PENDENTE: 'amber', APROVADA: 'green', RECUSADA: 'red' } as const;
const STATUS_LABEL = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', RECUSADA: 'Recusada' } as const;

export default function PontoPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [data, setData] = useState('');
  const [ocorrencia, setOcorrencia] = useState('');

  const { data: justifications } = useQuery({
    queryKey: ['dp', 'timeclock', 'justifications'],
    queryFn: async () => (await api.get<Justification[]>('/dp/timeclock/justifications')).data,
  });

  const { data: kpis } = useQuery({
    queryKey: ['dp', 'timeclock', 'kpis'],
    queryFn: async () => (await api.get<Kpis>('/dp/timeclock/kpis')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dp', 'timeclock'] });
  };

  const create = useMutation({
    mutationFn: async () => api.post('/dp/timeclock/justifications', { employeeId, data, ocorrencia }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setOcorrencia('');
    },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => api.post(`/dp/timeclock/justifications/${id}/approve`),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: async (id: string) => api.post(`/dp/timeclock/justifications/${id}/reject`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Justificativas pendentes" value={kpis?.pendentes ?? 0} />
        <KpiCard label="Aprovadas" value={kpis?.aprovadas ?? 0} />
        <KpiCard label="Recusadas" value={kpis?.recusadas ?? 0} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova justificativa'}</Button>
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
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Selecione…</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Ocorrência</span>
              <input value={ocorrencia} onChange={(e) => setOcorrencia(e.target.value)} placeholder="Atraso, falta de marcação…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Registrar
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-tertiary">
              <th className="pb-2">Colaborador</th>
              <th className="pb-2">Data</th>
              <th className="pb-2">Ocorrência</th>
              <th className="pb-2">Status</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {justifications?.map((j) => (
              <tr key={j.id} className="border-t border-divider">
                <td className="py-2">{j.employee.nome}</td>
                <td className="py-2 text-text-secondary">{new Date(j.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="py-2">{j.ocorrencia}</td>
                <td className="py-2">
                  <Badge tone={STATUS_TONE[j.status]}>{STATUS_LABEL[j.status]}</Badge>
                </td>
                <td className="py-2 text-right">
                  {j.status === 'PENDENTE' && (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => approve.mutate(j.id)}>Aprovar</Button>
                      <Button variant="secondary" onClick={() => reject.mutate(j.id)}>
                        Recusar
                      </Button>
                    </div>
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
