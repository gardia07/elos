'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface CursoRow {
  curso: string;
  validos: number;
  vencendo: number;
  vencidos: number;
}

interface Employee {
  id: string;
  nome: string;
}

export default function TreinamentosNrPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [curso, setCurso] = useState('');
  const [dataRealizacao, setDataRealizacao] = useState('');
  const [validadeMeses, setValidadeMeses] = useState('12');

  const { data: byCurso } = useQuery({
    queryKey: ['sst', 'nr-trainings', 'by-curso'],
    queryFn: async () => (await api.get<CursoRow[]>('/sst/nr-trainings/by-curso')).data,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/sst/nr-trainings', { employeeId, curso, dataRealizacao, validadeMeses: Number(validadeMeses) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst', 'nr-trainings'] });
      setShowForm(false);
      setCurso('');
      setDataRealizacao('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Registrar treinamento'}</Button>
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
              <span className="text-text-secondary">Curso (NR)</span>
              <input value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="NR-35 Trabalho em Altura" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data de realização</span>
              <input type="date" value={dataRealizacao} onChange={(e) => setDataRealizacao(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Validade (meses)</span>
              <select value={validadeMeses} onChange={(e) => setValidadeMeses(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="36">36</option>
              </select>
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
              <th className="px-5 py-3 font-medium">Curso</th>
              <th className="px-5 py-3 font-medium">Válidos</th>
              <th className="px-5 py-3 font-medium">Vencendo</th>
              <th className="px-5 py-3 font-medium">Vencidos</th>
            </tr>
          </thead>
          <tbody>
            {byCurso?.map((c) => (
              <tr key={c.curso} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{c.curso}</td>
                <td className="px-5 py-3">
                  <Badge tone="green">{c.validos}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="amber">{c.vencendo}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="red">{c.vencidos}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {byCurso?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum treinamento registrado.</p>}
      </Card>
    </div>
  );
}
