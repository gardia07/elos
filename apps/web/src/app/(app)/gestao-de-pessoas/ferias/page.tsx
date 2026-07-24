'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, KpiCard } from '@/components/ui';

interface VacationRequest {
  id: string;
  employeeId: string;
  inicio: string;
  fim: string;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  employee: { nome: string; departamento: string };
}

interface CalendarRow {
  employeeId: string;
  nome: string;
  leftPct: number;
  widthPct: number;
}

interface Balance {
  employeeId: string;
  nome: string;
  direito: number;
  gozados: number;
  aVencer: number;
  alerta: boolean;
}

interface Employee {
  id: string;
  nome: string;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FeriasPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const { data: pending } = useQuery({
    queryKey: ['vacations', 'requests', 'PENDENTE'],
    queryFn: async () => (await api.get<VacationRequest[]>('/rh/vacations/requests', { params: { status: 'PENDENTE' } })).data,
  });

  const { data: calendar } = useQuery({
    queryKey: ['vacations', 'calendar', month, year],
    queryFn: async () => (await api.get<CalendarRow[]>('/rh/vacations/calendar', { params: { month, year } })).data,
  });

  const { data: balances } = useQuery({
    queryKey: ['vacations', 'balances'],
    queryFn: async () => (await api.get<Balance[]>('/rh/vacations/balances')).data,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['vacations'] });
  };

  const createRequest = useMutation({
    mutationFn: async () => api.post('/rh/vacations/requests', { employeeId, inicio, fim }),
    onSuccess: () => {
      invalidateAll();
      setShowForm(false);
      setInicio('');
      setFim('');
    },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/vacations/requests/${id}/approve`),
    onSuccess: invalidateAll,
  });
  const reject = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/vacations/requests/${id}/reject`),
    onSuccess: invalidateAll,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Em férias no mês" value={calendar?.length ?? 0} />
        <KpiCard label="Solicitações pendentes" value={pending?.length ?? 0} />
        <KpiCard label="Colaboradores com saldo baixo" value={balances?.filter((b) => b.alerta).length ?? 0} />
        <KpiCard label="Saldo médio" value={balances?.length ? Math.round(balances.reduce((s, b) => s + b.aVencer, 0) / balances.length) : 0} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonth(i)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                month === i ? 'bg-accent text-on-accent' : 'bg-surface-alt text-text-secondary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Solicitar férias'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createRequest.mutate();
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
              <span className="text-text-secondary">Início</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Fim</span>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={createRequest.isPending}>
              Solicitar
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Calendário — {MONTHS[month]}</h3>
        <Card>
          {calendar?.length === 0 && <p className="text-sm text-text-tertiary">Ninguém de férias neste mês.</p>}
          <div className="flex flex-col gap-2">
            {calendar?.map((row) => (
              <div key={row.employeeId} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm">{row.nome}</span>
                <div className="relative h-5 flex-1 rounded-[6px] bg-surface-alt">
                  <div
                    className="absolute top-[2px] bottom-[2px] rounded-[5px] bg-accent"
                    style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {pending && pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Solicitações pendentes</h3>
          <div className="flex flex-col gap-2">
            {pending.map((r) => (
              <Card key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.employee.nome}</div>
                  <div className="text-sm text-text-secondary">
                    {new Date(r.inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a {new Date(r.fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approve.mutate(r.id)}>Aprovar</Button>
                  <Button variant="secondary" onClick={() => reject.mutate(r.id)}>
                    Recusar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Saldo por colaborador</h3>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-tertiary">
                <th className="pb-2">Colaborador</th>
                <th className="pb-2">Direito</th>
                <th className="pb-2">Gozados</th>
                <th className="pb-2">A vencer</th>
              </tr>
            </thead>
            <tbody>
              {balances?.map((b) => (
                <tr key={b.employeeId} className="border-t border-divider">
                  <td className="py-2">{b.nome}</td>
                  <td className="py-2">{b.direito}</td>
                  <td className="py-2">{b.gozados}</td>
                  <td className="py-2">
                    <Badge tone={b.alerta ? 'red' : 'green'}>{b.aVencer} dias</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
