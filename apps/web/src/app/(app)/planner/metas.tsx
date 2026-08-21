'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { Meta } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';

export function MetasSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
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
    <div className="flex max-w-3xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          <>
            <span className="text-2xl font-semibold" style={{ color: tema.cor }}>
              {pct}%
            </span>
            <p className="text-xs text-text-tertiary">
              {concluidas} de {total} concluídas
            </p>
          </>
        }
      />

      <Card className="flex flex-col gap-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tema.cor }} />
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
          className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm"
        />
        <Button type="submit" variant="add" disabled={criar.isPending || !titulo.trim()} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metas?.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 py-4">
            <input
              type="checkbox"
              checked={m.concluida}
              onChange={(e) => toggle.mutate({ id: m.id, concluida: e.target.checked })}
              className="h-4 w-4 shrink-0"
              style={{ accentColor: tema.cor }}
            />
            <span className={`flex-1 text-sm ${m.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}>{m.titulo}</span>
            <button type="button" onClick={() => excluir.mutate(m.id)} className="shrink-0 text-text-tertiary hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
        {metas?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma meta cadastrada ainda para {ano}.</p>}
      </div>
    </div>
  );
}
