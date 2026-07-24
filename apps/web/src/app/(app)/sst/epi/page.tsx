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

export default function SstEpiPage() {
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
    mutationFn: async () => api.post('/dp/equipment', { employeeId, item, entregaEm, validadeMeses: Number(validadeMeses) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'equipment'] });
      setShowForm(false);
      setItem('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-tertiary">
        Mesmo registro usado em DP → Uniforme e EPI — um único cadastro, visto pelos dois hubs.
      </p>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Registrar entrega de EPI'}</Button>
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
              <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Capacete, luva, protetor auditivo…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
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

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Entregue em</th>
              <th className="px-5 py-3 font-medium">Vence em</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((e) => (
              <tr key={e.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3">{e.employee.nome}</td>
                <td className="px-5 py-3">{e.item}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(e.entregaEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(e.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum EPI registrado.</p>}
      </Card>
    </div>
  );
}
