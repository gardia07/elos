'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

interface JobGrade {
  id: string;
  cargo: string;
  cbo: string | null;
  faixaMin: string;
  faixaMax: string;
  nivel: string;
  requisitos: string | null;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CargosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [cargo, setCargo] = useState('');
  const [cbo, setCbo] = useState('');
  const [faixaMin, setFaixaMin] = useState('');
  const [faixaMax, setFaixaMax] = useState('');
  const [nivel, setNivel] = useState('');
  const [requisitos, setRequisitos] = useState('');

  const { data } = useQuery({
    queryKey: ['dp', 'job-grades'],
    queryFn: async () => (await api.get<JobGrade[]>('/dp/job-grades')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/dp/job-grades', {
        cargo,
        cbo: cbo || undefined,
        faixaMin: Number(faixaMin),
        faixaMax: Number(faixaMax),
        nivel,
        requisitos: requisitos || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'job-grades'] });
      setShowForm(false);
      setCargo('');
      setCbo('');
      setFaixaMin('');
      setFaixaMax('');
      setNivel('');
      setRequisitos('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo cargo'}</Button>
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
              <span className="text-text-secondary">Cargo</span>
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">CBO</span>
              <input value={cbo} onChange={(e) => setCbo(e.target.value)} placeholder="0000-00" className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Faixa mín.</span>
              <input type="number" value={faixaMin} onChange={(e) => setFaixaMin(e.target.value)} required className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Faixa máx.</span>
              <input type="number" value={faixaMax} onChange={(e) => setFaixaMax(e.target.value)} required className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nível</span>
              <input value={nivel} onChange={(e) => setNivel(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Requisitos</span>
              <input value={requisitos} onChange={(e) => setRequisitos(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
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
              <th className="pb-2">Cargo</th>
              <th className="pb-2">CBO</th>
              <th className="pb-2">Faixa salarial</th>
              <th className="pb-2">Nível</th>
              <th className="pb-2">Requisitos</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((g) => (
              <tr key={g.id} className="border-t border-divider">
                <td className="py-2">{g.cargo}</td>
                <td className="py-2 text-text-secondary">{g.cbo ?? '—'}</td>
                <td className="py-2 text-text-secondary">
                  {formatBRL(Number(g.faixaMin))} – {formatBRL(Number(g.faixaMax))}
                </td>
                <td className="py-2">{g.nivel}</td>
                <td className="py-2 text-text-secondary">{g.requisitos ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
