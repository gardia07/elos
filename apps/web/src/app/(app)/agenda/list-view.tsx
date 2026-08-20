'use client';

import { useMemo, useState } from 'react';
import { Badge, Card } from '@/components/ui';
import { categoriaCor } from './lib';
import type { AgendaGeralEvento, Categoria } from './types';
import { HUB_FALLBACK_COLOR } from './types';

const BUCKET_LABEL = { vencido: 'Vencido', hoje: 'Hoje', semana: 'Próximos 7 dias', mes: 'Próximos 30 dias', futuro: 'Futuro' } as const;
const BUCKET_TONE = { vencido: 'red', hoje: 'amber', semana: 'blue', mes: 'grey', futuro: 'grey' } as const;
const BUCKETS: AgendaGeralEvento['bucket'][] = ['vencido', 'hoje', 'semana', 'mes', 'futuro'];

export function ListView({
  eventos,
  categorias,
  isDark,
  onEventClick,
  onToggleConcluida,
}: {
  eventos: AgendaGeralEvento[];
  categorias: Categoria[];
  isDark: boolean;
  onEventClick: (e: AgendaGeralEvento) => void;
  onToggleConcluida: (e: AgendaGeralEvento) => void;
}) {
  const [hubFiltro, setHubFiltro] = useState('Todos');
  const hubs = useMemo(() => ['Todos', ...Array.from(new Set(eventos.map((e) => e.hub)))], [eventos]);
  const filtered = eventos.filter((e) => hubFiltro === 'Todos' || e.hub === hubFiltro);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-8">
      <div className="flex flex-wrap gap-2">
        {hubs.map((h) => (
          <button
            key={h}
            onClick={() => setHubFiltro(h)}
            className={`rounded-control border px-4 py-2 text-sm transition ${
              hubFiltro === h ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Próximos eventos</h3>
        <div className="flex flex-col">
          {BUCKETS.map((bucket) => {
            const inBucket = filtered.filter((e) => e.bucket === bucket);
            if (inBucket.length === 0) return null;
            return (
              <div key={bucket}>
                <div className="mt-3 mb-1 flex items-center gap-2 first:mt-0">
                  <Badge tone={BUCKET_TONE[bucket]}>{BUCKET_LABEL[bucket]}</Badge>
                </div>
                {inBucket.map((e) => {
                  const isAgendaItem = e.origem === 'AGENDA_ITEM';
                  const cor = e.categoriaId
                    ? categoriaCor(categorias.find((c) => c.id === e.categoriaId), isDark)
                    : HUB_FALLBACK_COLOR[e.hub] ?? '#a89c8d';
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 border-b border-divider py-2.5 text-sm last:border-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <input type="checkbox" checked={e.concluida} disabled={e.concluida} onChange={() => onToggleConcluida(e)} />
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                        <button
                          type="button"
                          disabled={!isAgendaItem}
                          onClick={() => isAgendaItem && onEventClick(e)}
                          className={`truncate text-left ${isAgendaItem ? 'hover:underline' : ''} ${e.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}
                        >
                          {e.titulo}
                        </button>
                      </div>
                      <span className="shrink-0 text-xs text-text-tertiary">
                        {new Date(e.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {e.hub}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum evento nos próximos 90 dias.</p>}
        </div>
      </Card>
    </div>
  );
}
