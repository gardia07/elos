'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

type Origem = 'AGENDA_ITEM' | 'LABOR_DEADLINE' | 'OCCUPATIONAL_EXAM' | 'NR_TRAINING' | 'VACATION_REQUEST' | 'TERMINATION';

interface Evento {
  id: string;
  origem: Origem;
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
  concluida: boolean;
  hora?: string | null;
  tipo?: string;
  notas?: string | null;
}

const BUCKET_LABEL = { vencido: 'Vencido', hoje: 'Hoje', semana: 'Próximos 7 dias', mes: 'Próximos 30 dias', futuro: 'Futuro' } as const;
const BUCKET_TONE = { vencido: 'red', hoje: 'amber', semana: 'blue', mes: 'grey', futuro: 'grey' } as const;

function formatDiaLongo(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const texto = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function AgendaGeralPage() {
  const searchParams = useSearchParams();
  const data = searchParams.get('data') ?? undefined;
  const itemParam = searchParams.get('item');
  const queryClient = useQueryClient();

  const [hubFiltro, setHubFiltro] = useState('Todos');
  const [expandedId, setExpandedId] = useState<string | null>(itemParam);
  const [notasDraft, setNotasDraft] = useState('');

  const { data: eventos } = useQuery({
    queryKey: ['ferramentas', 'agenda-geral', data ?? 'geral'],
    queryFn: async () => (await api.get<Evento[]>('/ferramentas/agenda-geral', { params: data ? { data } : undefined })).data,
  });

  useEffect(() => {
    if (itemParam && eventos) {
      const evento = eventos.find((e) => e.id === itemParam);
      if (evento) setNotasDraft(evento.notas ?? '');
      const el = document.getElementById(`evento-${itemParam}`);
      el?.scrollIntoView({ block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ferramentas', 'agenda-geral', data ?? 'geral'] });

  const concluir = useMutation({
    mutationFn: async (vars: { origem: Origem; id: string }) => api.post('/ferramentas/agenda-geral/concluir', vars),
    onSuccess: invalidate,
  });

  const saveNotas = useMutation({
    mutationFn: async (vars: { id: string; notas: string }) => api.patch(`/agenda/items/${vars.id}`, { notas: vars.notas }),
    onSuccess: invalidate,
  });

  const hubs = useMemo(() => ['Todos', ...Array.from(new Set(eventos?.map((e) => e.hub) ?? []))], [eventos]);
  const filtered = (eventos ?? []).filter((e) => hubFiltro === 'Todos' || e.hub === hubFiltro);

  const buckets: Evento['bucket'][] = ['vencido', 'hoje', 'semana', 'mes', 'futuro'];

  return (
    <div className="flex flex-col gap-6">
      {data && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{formatDiaLongo(data)}</h2>
          <Link href="/ferramentas/agenda" className="text-xs text-accent hover:underline">
            ← Ver todos os próximos eventos
          </Link>
        </div>
      )}

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

      {data ? (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Agenda do dia</h3>
          <div className="flex flex-col gap-2">
            {filtered.map((e) => {
              const isAgendaItem = e.origem === 'AGENDA_ITEM';
              const isExpanded = expandedId === e.id;
              return (
                <div key={e.id} id={`evento-${e.id}`} className="rounded-[10px] border border-border p-2.5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={e.concluida}
                      disabled={e.concluida}
                      onChange={() => concluir.mutate({ origem: e.origem, id: e.id })}
                      className="mt-0.5"
                    />
                    <button
                      type="button"
                      className="flex-1 text-left"
                      disabled={!isAgendaItem}
                      onClick={() => {
                        if (!isAgendaItem) return;
                        if (isExpanded) {
                          setExpandedId(null);
                        } else {
                          setExpandedId(e.id);
                          setNotasDraft(e.notas ?? '');
                        }
                      }}
                    >
                      {e.hora && <div className="text-xs font-medium text-text-tertiary">{e.hora}</div>}
                      <div className={`text-sm ${e.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}>{e.titulo}</div>
                    </button>
                    <span className="text-xs text-text-tertiary">{e.hub}</span>
                    {isAgendaItem && <span className="text-text-tertiary">{isExpanded ? '▾' : '▸'}</span>}
                  </div>
                  {isAgendaItem && isExpanded && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-divider pt-2 pl-6">
                      <textarea
                        value={notasDraft}
                        onChange={(ev) => setNotasDraft(ev.target.value)}
                        placeholder="Anotações, instruções ou etapas…"
                        rows={3}
                        className="rounded-[10px] border border-border-strong bg-surface px-2.5 py-2 text-sm"
                      />
                      <Button
                        variant="secondary"
                        className="self-start"
                        onClick={() => saveNotas.mutate({ id: e.id, notas: notasDraft })}
                        disabled={saveNotas.isPending}
                      >
                        {saveNotas.isPending ? 'Salvando…' : 'Salvar nota'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nada na agenda para este dia.</p>}
          </div>
        </Card>
      ) : (
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
                  {inBucket.map((e) => (
                    <div key={e.id} className="flex items-center justify-between border-b border-divider py-2.5 text-sm last:border-0">
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
      )}
    </div>
  );
}
