'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

interface Department {
  id: string;
  nome: string;
  descricao: string | null;
}

export default function DepartamentosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const { data } = useQuery({
    queryKey: ['dp', 'departments'],
    queryFn: async () => (await api.get<Department[]>('/dp/departments')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/dp/departments', { nome, descricao: descricao || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dp', 'departments'] });
      setShowForm(false);
      setNome('');
      setDescricao('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo departamento'}</Button>
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
              <span className="text-text-secondary">Descrição</span>
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
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
              <th className="pb-2">Nome</th>
              <th className="pb-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.id} className="border-t border-divider">
                <td className="py-2">{d.nome}</td>
                <td className="py-2 text-text-secondary">{d.descricao ?? '—'}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-text-tertiary">Nenhum departamento cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
