'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Drawer } from '@/components/ui';
import { addDaysLocal, formatDiaLongoIso, localIso, parseIsoLocal } from './lib';
import type { AgendaItem } from './types';

function amanhaIso(date: string): string {
  return localIso(addDaysLocal(parseIsoLocal(date), 1));
}

export function DailyReviewDrawer({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const queryClient = useQueryClient();
  const [reflexao, setReflexao] = useState('');
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: items } = useQuery({
    queryKey: ['agenda', 'items', date],
    queryFn: async () => (await api.get<AgendaItem[]>('/agenda/items', { params: { data: date } })).data,
    enabled: open,
  });

  const { data: revisao } = useQuery({
    queryKey: ['agenda', 'revisao', date],
    queryFn: async () => (await api.get<{ reflexao: string }>(`/agenda/revisao/${date}`)).data,
    enabled: open,
  });

  useEffect(() => {
    setReflexao(revisao?.reflexao ?? '');
    setDirty(false);
  }, [revisao, date]);

  const saveReflexao = useMutation({
    mutationFn: async (texto: string) => api.put(`/agenda/revisao/${date}`, { reflexao: texto }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['agenda', 'revisao', date] });
    },
  });

  function handleReflexaoChange(value: string) {
    setReflexao(value);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveReflexao.mutate(value), 800);
  }

  const reagendar = useMutation({
    mutationFn: async (vars: { id: string; data: string }) => api.patch(`/agenda/items/${vars.id}`, { data: vars.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['ferramentas', 'agenda-geral'] });
    },
  });

  const concluidos = (items ?? []).filter((i) => i.concluida);
  const pendentes = (items ?? []).filter((i) => !i.concluida);

  return (
    <Drawer open={open} onClose={onClose} title={`Revisão do dia — ${formatDiaLongoIso(date)}`}>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Concluídos ({concluidos.length})</h3>
          {concluidos.length === 0 ? (
            <p className="text-xs text-text-tertiary">Nada concluído ainda hoje.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {concluidos.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span className="line-through">{i.descricao}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Pendentes ({pendentes.length})</h3>
          {pendentes.length === 0 ? (
            <p className="text-xs text-text-tertiary">Nada pendente — dia limpo.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pendentes.map((i) => (
                <li key={i.id} className="flex items-center gap-2 rounded-[10px] border border-border p-2 text-sm">
                  <Circle className="h-4 w-4 shrink-0 text-text-tertiary" />
                  <span className="flex-1 text-text">{i.descricao}</span>
                  <button
                    type="button"
                    disabled={reagendar.isPending}
                    onClick={() => reagendar.mutate({ id: i.id, data: amanhaIso(date) })}
                    className="flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Amanhã <ArrowRight className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Reflexão do dia</span>
          <textarea
            value={reflexao}
            onChange={(e) => handleReflexaoChange(e.target.value)}
            placeholder="Como foi o dia? O que valeu a pena registrar?"
            rows={4}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
          <span className="text-[11px] text-text-tertiary">{saveReflexao.isPending || dirty ? 'Salvando…' : 'Salvo'}</span>
        </label>
      </div>
    </Drawer>
  );
}
