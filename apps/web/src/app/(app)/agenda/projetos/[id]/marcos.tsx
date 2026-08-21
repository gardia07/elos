'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ProjetoMarco } from '../../types';
import { localIso, parseIsoUtc } from '../../lib';

export function ProjetoMarcos({ projetoId }: { projetoId: string }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(() => localIso(new Date()));

  const { data: marcos } = useQuery({
    queryKey: ['agenda', 'projetos', projetoId, 'marcos'],
    queryFn: async () => (await api.get<ProjetoMarco[]>(`/agenda/projetos/${projetoId}/marcos`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos', projetoId, 'marcos'] });

  const criar = useMutation({
    mutationFn: async () => api.post(`/agenda/projetos/${projetoId}/marcos`, { titulo, data }),
    onSuccess: () => {
      setTitulo('');
      invalidate();
    },
  });
  const alternar = useMutation({
    mutationFn: async (vars: { id: string; concluido: boolean }) => api.patch(`/agenda/projetos/${projetoId}/marcos/${vars.id}`, { concluido: vars.concluido }),
    onSuccess: invalidate,
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/agenda/projetos/${projetoId}/marcos/${id}`),
    onSuccess: invalidate,
  });

  const hojeIso = localIso(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {(marcos ?? []).map((m) => {
          const atrasado = !m.concluido && m.data.slice(0, 10) < hojeIso;
          return (
            <div key={m.id} className="group flex items-center gap-2 rounded-container border border-border bg-surface px-3 py-2">
              <input type="checkbox" checked={m.concluido} onChange={(e) => alternar.mutate({ id: m.id, concluido: e.target.checked })} />
              <Flag className={cn('h-3.5 w-3.5 shrink-0', atrasado ? 'text-danger' : 'text-text-tertiary')} />
              <span className={cn('flex-1 text-sm', m.concluido && 'text-text-tertiary line-through')}>{m.titulo}</span>
              <span className={cn('text-xs', atrasado ? 'text-danger' : 'text-text-tertiary')}>
                {parseIsoUtc(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
              </span>
              <button
                type="button"
                onClick={() => excluir.mutate(m.id)}
                className="text-text-tertiary opacity-0 hover:text-danger group-hover:opacity-100"
                aria-label="Excluir marco"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {(marcos ?? []).length === 0 && <p className="text-xs text-text-tertiary">Nenhum marco ainda. Adicione datas-chave do projeto, como entregas de fase.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Novo marco…"
          className="min-w-[160px] flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm" />
        <Button
          type="button"
          disabled={!titulo.trim() || criar.isPending}
          onClick={() => criar.mutate()}
          className="flex items-center justify-center"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
