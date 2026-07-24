'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';

interface Evento {
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
}

const BUCKET_LABEL = { vencido: 'Vencido', hoje: 'Hoje', semana: 'Próximos 7 dias', mes: 'Próximos 30 dias', futuro: 'Futuro' } as const;
const BUCKET_TONE = { vencido: 'red', hoje: 'amber', semana: 'blue', mes: 'grey', futuro: 'grey' } as const;

export default function AgendaGeralPage() {
  const [hubFiltro, setHubFiltro] = useState('Todos');

  const { data: eventos } = useQuery({
    queryKey: ['ferramentas', 'agenda-geral'],
    queryFn: async () => (await api.get<Evento[]>('/ferramentas/agenda-geral')).data,
  });

  const hubs = ['Todos', ...Array.from(new Set(eventos?.map((e) => e.hub) ?? []))];
  const filtered = (eventos ?? []).filter((e) => hubFiltro === 'Todos' || e.hub === hubFiltro);

  const buckets: Evento['bucket'][] = ['vencido', 'hoje', 'semana', 'mes', 'futuro'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {hubs.map((h) => (
          <button
            key={h}
            onClick={() => setHubFiltro(h)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
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
          {buckets.map((bucket) => {
            const inBucket = filtered.filter((e) => e.bucket === bucket);
            if (inBucket.length === 0) return null;
            return (
              <div key={bucket}>
                <div className="mt-3 mb-1 flex items-center gap-2 first:mt-0">
                  <Badge tone={BUCKET_TONE[bucket]}>{BUCKET_LABEL[bucket]}</Badge>
                </div>
                {inBucket.map((e, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-divider py-2.5 text-sm last:border-0">
                    <span>{e.titulo}</span>
                    <span className="text-xs text-text-tertiary">
                      {new Date(e.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {e.hub}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum evento nos próximos 90 dias.</p>}
        </div>
      </Card>
    </div>
  );
}
