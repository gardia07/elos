'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { HumorRegistro } from './types';
import { localIso } from './lib';

const NIVEIS = [
  { valor: 1, emoji: '😞', label: 'Péssimo' },
  { valor: 2, emoji: '😕', label: 'Ruim' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '🙂', label: 'Bom' },
  { valor: 5, emoji: '😄', label: 'Ótimo' },
];

export function HumorSection({ ano }: { ano: number }) {
  const queryClient = useQueryClient();
  const hojeIso = localIso(new Date());
  const [data, setData] = useState(hojeIso);
  const [nota, setNota] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'humor', ano],
    queryFn: async () => (await api.get<HumorRegistro[]>('/planner/humor', { params: { ano } })).data,
  });

  const registroDoDia = registros?.find((r) => r.data.slice(0, 10) === data);

  const salvar = useMutation({
    mutationFn: async (nivel: number) => api.put('/planner/humor', { data, nivel, nota: nota || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'humor', ano] }),
  });

  const recentes = useMemo(() => (registros ?? []).slice().reverse().slice(0, 14), [registros]);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Como você está hoje?</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={hojeIso}
            className="rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-sm"
          />
        </label>
        <div className="flex justify-between gap-2">
          {NIVEIS.map((n) => (
            <button
              key={n.valor}
              type="button"
              onClick={() => salvar.mutate(n.valor)}
              title={n.label}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 rounded-[10px] border py-3 text-2xl transition',
                registroDoDia?.nivel === n.valor ? 'border-accent bg-tint-blue' : 'border-border-strong bg-surface hover:border-accent',
              )}
            >
              {n.emoji}
              <span className="text-[10px] text-text-tertiary">{n.label}</span>
            </button>
          ))}
        </div>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Alguma nota sobre o dia (opcional)…"
          rows={2}
          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button type="button" onClick={() => registroDoDia && salvar.mutate(registroDoDia.nivel)} disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar nota'}
        </Button>
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text">Últimos registros</span>
        {recentes.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-[10px] border border-border p-2.5 text-sm">
            <span className="text-xl">{NIVEIS.find((n) => n.valor === r.nivel)?.emoji}</span>
            <span className="text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
            {r.nota && <span className="flex-1 truncate text-text-secondary">{r.nota}</span>}
          </div>
        ))}
        {recentes.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}
