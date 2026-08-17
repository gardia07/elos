'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Flame, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Habito } from './types';
import { diasDoMes, MESES } from './lib';

const SUGESTOES = ['Leitura', 'Meditação', 'Corrida', 'Ciclismo', 'Beber água', 'Exercício físico', 'Dormir cedo', 'Estudar'];
const CORES = ['#3b82f6', '#c9a227', '#6d8a3d', '#b06a5e', '#8A7FB0', '#e0729b'];

function milestone(streak: number): string | null {
  if (streak >= 100) return '🏆 100 dias';
  if (streak >= 30) return '⭐ 30 dias';
  if (streak >= 7) return '🔥 7 dias';
  return null;
}

export function HabitosSection({ ano }: { ano: number }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [mes, setMes] = useState(new Date().getMonth());

  const { data: habitos } = useQuery({
    queryKey: ['planner', 'habitos', ano],
    queryFn: async () => (await api.get<Habito[]>('/planner/habitos', { params: { ano } })).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['planner', 'habitos', ano] });

  const criar = useMutation({
    mutationFn: async (nomeHabito: string) => api.post('/planner/habitos', { ano, nome: nomeHabito, cor: CORES[(habitos?.length ?? 0) % CORES.length] }),
    onSuccess: () => {
      invalidate();
      setNome('');
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/planner/habitos/${id}`),
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; data: string }) => api.post(`/planner/habitos/${vars.id}/toggle`, { data: vars.data }),
    onSuccess: invalidate,
  });

  const dias = diasDoMes(ano, mes);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text">Sugestões</span>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => criar.mutate(s)}
              className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            >
              + {s}
            </button>
          ))}
        </div>
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) criar.mutate(nome.trim());
        }}
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Outro hábito…"
          className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={criar.isPending || !nome.trim()} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>

      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => setMes((m) => Math.max(0, m - 1))} disabled={mes === 0} className="text-text-secondary disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-text">{MESES[mes]}</span>
        <button type="button" onClick={() => setMes((m) => Math.min(11, m + 1))} disabled={mes === 11} className="text-text-secondary disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {habitos?.map((h) => {
          const marco = milestone(h.streakAtual);
          return (
            <Card key={h.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: h.cor }} />
                  <span className="text-sm font-semibold text-text">{h.nome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Flame className={cn('h-3.5 w-3.5', h.streakAtual > 0 ? 'text-danger' : 'text-text-tertiary')} />
                    {h.streakAtual} dia(s) · recorde {h.streakRecorde}
                  </span>
                  {marco && <span className="text-xs font-medium text-accent">{marco}</span>}
                  <button type="button" onClick={() => excluir.mutate(h.id)} className="text-text-tertiary hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dias.map((dia) => {
                  const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const marcado = h.diasMarcados.includes(iso);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggle.mutate({ id: h.id, data: iso })}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-[6px] border text-[11px] transition',
                        marcado ? 'border-transparent text-on-accent' : 'border-border-strong bg-surface text-text-tertiary hover:border-accent',
                      )}
                      style={marcado ? { backgroundColor: h.cor } : undefined}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {habitos?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum hábito cadastrado ainda. Escolha uma sugestão acima ou crie o seu.</p>}
      </div>
    </div>
  );
}
