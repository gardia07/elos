'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface Benefit {
  id: string;
  nome: string;
  elegibilidade: string;
  custoMensal: string;
  inscritos: number;
  adesaoPct: number;
  custoTotalMensal: number;
}

interface Employee {
  id: string;
  nome: string;
}

interface Enrollment {
  employeeId: string;
  employee: { id: string; nome: string; departamento: string };
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function BeneficiosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [elegibilidade, setElegibilidade] = useState('');
  const [custoMensal, setCustoMensal] = useState('');
  const [openBenefit, setOpenBenefit] = useState<Benefit | null>(null);
  const [enrollEmployeeId, setEnrollEmployeeId] = useState('');

  const { data: benefits } = useQuery({
    queryKey: ['dp', 'benefits'],
    queryFn: async () => (await api.get<Benefit[]>('/dp/benefits')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['dp', 'benefits', openBenefit?.id, 'enrollments'],
    queryFn: async () => (await api.get<Enrollment[]>(`/dp/benefits/${openBenefit!.id}/enrollments`)).data,
    enabled: !!openBenefit,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dp', 'benefits'] });
  };

  const create = useMutation({
    mutationFn: async () => api.post('/dp/benefits', { nome, elegibilidade, custoMensal: Number(custoMensal) }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
    },
  });

  const enroll = useMutation({
    mutationFn: async () => api.post(`/dp/benefits/${openBenefit!.id}/enroll`, { employeeId: enrollEmployeeId }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', openBenefit?.id, 'enrollments'] });
      setEnrollEmployeeId('');
    },
  });

  const unenroll = useMutation({
    mutationFn: async (employeeId: string) => api.delete(`/dp/benefits/${openBenefit!.id}/enroll/${employeeId}`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['dp', 'benefits', openBenefit?.id, 'enrollments'] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo benefício'}</Button>
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
              <span className="text-text-secondary">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Elegibilidade</span>
              <input value={elegibilidade} onChange={(e) => setElegibilidade(e.target.value)} placeholder="Todos os CLT, Opcional…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Custo/colaborador (mês)</span>
              <input type="number" value={custoMensal} onChange={(e) => setCustoMensal(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Salvar
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-tertiary">
              <th className="pb-2">Benefício</th>
              <th className="pb-2">Elegibilidade</th>
              <th className="pb-2">Adesão</th>
              <th className="pb-2">Custo total/mês</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {benefits?.map((b) => (
              <tr key={b.id} className="border-t border-divider">
                <td className="py-2">{b.nome}</td>
                <td className="py-2 text-text-secondary">{b.elegibilidade}</td>
                <td className="py-2">
                  <Badge tone="blue">
                    {b.adesaoPct}% ({b.inscritos})
                  </Badge>
                </td>
                <td className="py-2 font-medium">{formatBRL(b.custoTotalMensal)}</td>
                <td className="py-2 text-right">
                  <Button variant="secondary" onClick={() => setOpenBenefit(b)}>
                    Gerenciar inscritos
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!openBenefit} onClose={() => setOpenBenefit(null)} title={openBenefit?.nome ?? ''}>
        <div className="flex flex-col gap-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enroll.mutate();
            }}
          >
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Inscrever colaborador</span>
              <select
                value={enrollEmployeeId}
                onChange={(e) => setEnrollEmployeeId(e.target.value)}
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
            <Button type="submit" disabled={enroll.isPending}>
              Inscrever
            </Button>
          </form>

          <ul className="flex flex-col gap-2">
            {enrollments?.map((en) => (
              <li key={en.employeeId} className="flex items-center justify-between text-sm">
                <span>
                  {en.employee.nome} <span className="text-text-tertiary">· {en.employee.departamento}</span>
                </span>
                <button
                  onClick={() => unenroll.mutate(en.employeeId)}
                  className="text-xs text-danger hover:underline"
                >
                  remover
                </button>
              </li>
            ))}
            {enrollments?.length === 0 && <p className="text-sm text-text-tertiary">Ninguém inscrito.</p>}
          </ul>
        </div>
      </Drawer>
    </div>
  );
}
