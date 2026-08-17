'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { Meta } from './types';

export function MetasSection({ ano }: { ano: number }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');

  const { data: metas } = useQuery({
    queryKey: ['planner', 'metas', ano],
    queryFn: async () => (await api.get<Meta[]>('/planner/metas', { params: { ano } })).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['planner', 'metas', ano] });

  const criar = useMutation({
    mutationFn: async () => api.post('/planner/metas', { ano, titulo }),
    onSuccess: () => {
      invalidate();
      setTitulo('');
    },
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; concluida: boolean }) => api.patch(`/planner/metas/${vars.id}`, { concluida: vars.concluida }),
    onSuccess: invalidate,
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/planner/metas/${id}`),
    onSuccess: invalidate,
  });

  const concluidas = metas?.filter((m) => m.concluida).length ?? 0;
  const total = metas?.length ?? 0;
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-text">Metas de {ano}</span>
          <span className="text-text-tertiary">
            {concluidas} de {total} concluídas
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (titulo.trim()) criar.mutate();
        }}
      >
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: viajar para a praia, terminar o curso de inglês…"
          className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={criar.isPending || !titulo.trim()} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        {metas?.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={m.concluida}
              onChange={(e) => toggle.mutate({ id: m.id, concluida: e.target.checked })}
              className="h-4 w-4"
            />
            <span className={`flex-1 text-sm ${m.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}>{m.titulo}</span>
            <button type="button" onClick={() => excluir.mutate(m.id)} className="text-text-tertiary hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
        {metas?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma meta cadastrada ainda para {ano}.</p>}
      </div>
    </div>
  );
}
