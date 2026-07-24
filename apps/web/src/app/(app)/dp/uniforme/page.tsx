'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface EquipmentItem {
  id: string;
  item: string;
  entregaEm: string;
  vencimento: string;
  status: 'Válido' | 'Vencendo' | 'Vencido';
  employee: { nome: string };
}

interface Employee {
  id: string;
  nome: string;
}

const STATUS_TONE = { Válido: 'green', Vencendo: 'amber', Vencido: 'red' } as const;

export default function UniformePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [item, setItem] = useState('');
  const [entregaEm, setEntregaEm] = useState('');
  const [validadeMeses, setValidadeMeses] = useState('12');

  const { data } = useQuery({
    queryKey: ['dp', 'equipment'],
    queryFn: async () => (await api.get<EquipmentItem[]>('/dp/equipment')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/dp/equipment', { employeeId, item, entregaEm, validadeMeses: Number(validadeMeses) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'equipment'] });
      setShowForm(false);
      setItem('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo registro'}</Button>
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
              <span className="text-text-secondary">Item</span>
              <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Uniforme, EPI…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Entregue em</span>
              <input type="date" value={entregaEm} onChange={(e) => setEntregaEm(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Validade (meses)</span>
              <input type="number" min={1} value={validadeMeses} onChange={(e) => setValidadeMeses(e.target.value)} required className="w-24 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
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
              <th className="pb-2">Item</th>
              <th className="pb-2">Entregue em</th>
              <th className="pb-2">Vence em</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id} className="border-t border-divider">
                <td className="py-2">{e.employee.nome}</td>
                <td className="py-2">{e.item}</td>
                <td className="py-2 text-text-secondary">{new Date(e.entregaEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="py-2 text-text-secondary">{new Date(e.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="py-2">
                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
