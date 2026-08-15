'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Header } from '@/components/header';
import { AgendaHeader, CategoryLegend, EventFormDrawer, EventFormValues, recorrenciaFromValues } from './components';
import { MonthView } from './month-view';
import { TimelineView } from './timeline-view';
import { ListView } from './list-view';
import { NotesPanel } from './notes-panel';
import { DailyReviewDrawer } from './daily-review';
import {
  addDaysLocal,
  formatDiaLongo,
  formatMonthYear,
  getMonthGridWeeks,
  horaToMinutos,
  localIso,
  minutosToHora,
  parseIsoLocal,
  startOfWeekSunday,
  useIsDarkTheme,
} from './lib';
import type { AgendaGeralEvento, AgendaItem, CalendarEvent, Categoria, AgendaView, Usuario } from './types';

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpointPx]);
  return isMobile;
}

function itemToCalendarEvent(item: AgendaItem): CalendarEvent {
  return {
    id: item.id,
    origem: 'AGENDA_ITEM',
    data: item.data.slice(0, 10),
    hora: item.hora,
    horaFim: item.horaFim,
    titulo: item.descricao,
    categoriaId: item.categoriaId,
    concluida: item.concluida,
    editable: true,
    notas: item.notas,
    tipo: item.tipo,
    raw: item,
  };
}

/** Usado só para abrir o drawer de edição a partir da visão Lista, onde a query de /agenda/items fica desabilitada — o feed de agenda-geral já carrega tudo que o form precisa. */
function geralToAgendaItem(e: AgendaGeralEvento): AgendaItem {
  return {
    id: e.id,
    data: e.data,
    hora: e.hora ?? null,
    horaFim: null,
    descricao: e.titulo,
    notas: e.notas ?? null,
    tipo: e.tipo ?? 'TAREFA',
    categoriaId: e.categoriaId ?? null,
    categoria: null,
    concluida: e.concluida,
    origem: 'MANUAL',
    recorrenciaId: e.recorrenciaId ?? null,
    responsavelId: e.responsavelId ?? null,
  };
}

function geralToCalendarEvent(e: AgendaGeralEvento): CalendarEvent {
  return {
    id: e.id,
    origem: e.origem,
    data: e.data.slice(0, 10),
    hora: e.hora ?? null,
    horaFim: null,
    titulo: e.titulo,
    categoriaId: e.categoriaId ?? null,
    concluida: e.concluida,
    editable: false,
    notas: e.notas,
    tipo: e.tipo,
    hub: e.hub,
  };
}

export default function AgendaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDark = useIsDarkTheme();
  const isMobile = useIsMobile();

  const initialView = (searchParams.get('view') as AgendaView | null) ?? 'mes';
  const [view, setView] = useState<AgendaView>(['mes', 'semana', 'dia', 'lista'].includes(initialView) ? initialView : 'mes');
  const [anchorDate, setAnchorDate] = useState(() => {
    const dataParam = searchParams.get('data');
    return dataParam ? parseIsoLocal(dataParam) : new Date();
  });
  const [search, setSearch] = useState('');
  const [activeCategoryIds, setActiveCategoryIds] = useState<Set<string>>(new Set());
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; item: AgendaItem | null; defaultDate?: string; defaultHora?: string }>({
    open: false,
    item: null,
  });
  const [reviewOpen, setReviewOpen] = useState(false);

  const today = new Date();
  const todayIso = localIso(today);

  useEffect(() => {
    router.replace(`/agenda?view=${view}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const weeks = useMemo(() => getMonthGridWeeks(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeekSunday(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDaysLocal(start, i));
  }, [anchorDate]);

  const rangeStart = useMemo(() => {
    if (view === 'mes') return weeks[0][0];
    if (view === 'semana') return weekDays[0];
    return anchorDate;
  }, [view, weeks, weekDays, anchorDate]);
  const rangeEnd = useMemo(() => {
    if (view === 'mes') return weeks[weeks.length - 1][6];
    if (view === 'semana') return weekDays[6];
    return anchorDate;
  }, [view, weeks, weekDays, anchorDate]);
  const rangeStartIso = localIso(rangeStart);
  const rangeEndIso = localIso(rangeEnd);

  const { data: categorias } = useQuery({
    queryKey: ['agenda', 'categorias'],
    queryFn: async () => (await api.get<Categoria[]>('/agenda/categorias')).data,
  });

  const { data: usuarios } = useQuery({
    queryKey: ['agenda', 'usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/agenda/usuarios')).data,
  });

  const { data: items } = useQuery({
    queryKey: ['agenda', 'items', rangeStartIso, rangeEndIso],
    queryFn: async () => (await api.get<AgendaItem[]>('/agenda/items', { params: { dataInicio: rangeStartIso, dataFim: rangeEndIso } })).data,
    enabled: view !== 'lista',
  });

  const { data: geral } = useQuery({
    queryKey: ['ferramentas', 'agenda-geral', 'geral'],
    queryFn: async () => (await api.get<AgendaGeralEvento[]>('/ferramentas/agenda-geral')).data,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda', 'items'] });
    queryClient.invalidateQueries({ queryKey: ['ferramentas', 'agenda-geral'] });
  };

  const createItem = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<AgendaItem>('/agenda/items', payload)).data,
    onSuccess: invalidateAll,
  });
  const updateItem = useMutation({
    mutationFn: async (vars: { id: string; payload: Record<string, unknown> }) => (await api.patch<AgendaItem>(`/agenda/items/${vars.id}`, vars.payload)).data,
    onSuccess: invalidateAll,
  });
  const deleteItem = useMutation({
    mutationFn: async (id: string) => api.delete(`/agenda/items/${id}`),
    onSuccess: invalidateAll,
  });
  const deleteSeries = useMutation({
    mutationFn: async (recorrenciaId: string) => api.delete(`/agenda/recorrencias/${recorrenciaId}`),
    onSuccess: invalidateAll,
  });
  const concluirGeral = useMutation({
    mutationFn: async (vars: { origem: string; id: string }) => api.post('/ferramentas/agenda-geral/concluir', vars),
    onSuccess: invalidateAll,
  });

  const allEvents: CalendarEvent[] = useMemo(() => {
    const fromItems = (items ?? []).map(itemToCalendarEvent);
    const fromGeral = (geral ?? [])
      .filter((e) => e.origem !== 'AGENDA_ITEM')
      .filter((e) => e.data.slice(0, 10) >= rangeStartIso && e.data.slice(0, 10) <= rangeEndIso)
      .map(geralToCalendarEvent);
    return [...fromItems, ...fromGeral];
  }, [items, geral, rangeStartIso, rangeEndIso]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (activeCategoryIds.size > 0 && e.categoriaId && !activeCategoryIds.has(e.categoriaId)) return false;
      if (activeCategoryIds.size > 0 && !e.categoriaId) return false;
      if (term && !e.titulo.toLowerCase().includes(term) && !(e.notas ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [allEvents, activeCategoryIds, search]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filteredEvents) {
      const list = map.get(e.data) ?? [];
      list.push(e);
      map.set(e.data, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'));
    return map;
  }, [filteredEvents]);

  function toggleCategory(id: string) {
    setActiveCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(defaultDate?: string, defaultHora?: string) {
    setDrawer({ open: true, item: null, defaultDate: defaultDate ?? localIso(anchorDate), defaultHora });
  }
  function openEdit(event: CalendarEvent) {
    if (!event.editable || !event.raw) return;
    setDrawer({ open: true, item: event.raw });
  }

  function handleSave(values: EventFormValues) {
    const payload: Record<string, unknown> = {
      data: values.data,
      hora: values.diaInteiro ? null : values.hora || null,
      horaFim: values.diaInteiro ? null : values.horaFim || null,
      descricao: values.descricao,
      notas: values.notas || null,
      tipo: values.tipo,
      categoriaId: values.categoriaId || null,
      responsavelId: values.responsavelId || null,
    };
    if (drawer.item) {
      updateItem.mutate({ id: drawer.item.id, payload }, { onSuccess: () => setDrawer({ open: false, item: null }) });
    } else {
      const recorrencia = recorrenciaFromValues(values);
      if (recorrencia) payload.recorrencia = recorrencia;
      createItem.mutate(payload, { onSuccess: () => setDrawer({ open: false, item: null }) });
    }
  }

  function handleDelete() {
    if (!drawer.item) return;
    deleteItem.mutate(drawer.item.id, { onSuccess: () => setDrawer({ open: false, item: null }) });
  }

  function handleDeleteSeries() {
    if (!drawer.item?.recorrenciaId) return;
    deleteSeries.mutate(drawer.item.recorrenciaId, { onSuccess: () => setDrawer({ open: false, item: null }) });
  }

  function toggleConcluida(event: CalendarEvent) {
    if (event.editable) {
      updateItem.mutate({ id: event.id, payload: { concluida: !event.concluida } });
    } else {
      concluirGeral.mutate({ origem: event.origem, id: event.id });
    }
  }

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over) return;
    const activeData = active.data.current as { type: 'event' | 'note-line'; event?: CalendarEvent; text?: string } | undefined;
    const overData = over.data.current as { type: 'day' | 'slot'; iso: string; hora?: string } | undefined;
    if (!activeData || !overData) return;

    const novaData = overData.iso;
    const novaHora = overData.type === 'slot' ? overData.hora : undefined;

    if (activeData.type === 'event' && activeData.event) {
      const evt = activeData.event;
      const payload: Record<string, unknown> = { data: novaData };
      if (novaHora && evt.hora) {
        const duracao = evt.horaFim ? horaToMinutos(evt.horaFim) - horaToMinutos(evt.hora) : 30;
        payload.hora = novaHora;
        payload.horaFim = minutosToHora(horaToMinutos(novaHora) + Math.max(15, duracao));
      } else if (novaHora) {
        payload.hora = novaHora;
      }
      updateItem.mutate({ id: evt.id, payload });
    } else if (activeData.type === 'note-line' && activeData.text) {
      createItem.mutate({ data: novaData, hora: novaHora, descricao: activeData.text, tipo: 'TAREFA' });
    }
  }

  function stepPeriod(direction: 1 | -1) {
    if (view === 'mes') setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
    else if (view === 'semana') setAnchorDate((d) => addDaysLocal(d, 7 * direction));
    else setAnchorDate((d) => addDaysLocal(d, direction));
  }

  const periodLabel =
    view === 'mes'
      ? formatMonthYear(anchorDate)
      : view === 'dia'
        ? formatDiaLongo(anchorDate)
        : view === 'semana'
          ? `${weekDays[0].getDate()} — ${weekDays[6].getDate()} de ${formatMonthYear(weekDays[6])}`
          : 'Próximos eventos';

  const notesDateIso = view === 'dia' ? localIso(anchorDate) : todayIso;
  const showNotesPanel = view === 'dia' || view === 'semana';

  return (
    <>
      <Header eyebrow="Seu dia a dia" title="Agenda" />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AgendaHeader
            view={view}
            onViewChange={setView}
            periodLabel={periodLabel}
            onPrev={() => stepPeriod(-1)}
            onNext={() => stepPeriod(1)}
            onToday={() => setAnchorDate(new Date())}
            onNew={() => openCreate()}
            onOpenReview={() => setReviewOpen(true)}
            search={search}
            onSearchChange={setSearch}
          />
          {view !== 'lista' && (
            <CategoryLegend categorias={categorias ?? []} isDark={isDark} activeIds={activeCategoryIds} onToggle={toggleCategory} />
          )}

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="flex min-h-0 flex-1 flex-col">
              {view === 'mes' &&
                (isMobile ? (
                  <div className="flex flex-col gap-2 overflow-y-auto p-4">
                    {weeks.flat().map((d) => {
                      const iso = localIso(d);
                      const dayEvents = eventsByDay.get(iso) ?? [];
                      if (d.getMonth() !== anchorDate.getMonth() && dayEvents.length === 0) return null;
                      return (
                        <div key={iso} className="rounded-[10px] border border-border p-2.5">
                          <div className="mb-1 text-xs font-semibold text-text-tertiary">{formatDiaLongo(d)}</div>
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-text-tertiary">Sem itens.</p>
                          ) : (
                            dayEvents.map((e) => (
                              <div key={e.id} className="py-0.5 text-sm text-text">
                                {e.hora && <span className="mr-1.5 text-text-tertiary">{e.hora}</span>}
                                {e.titulo}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <MonthView
                    weeks={weeks}
                    eventsByDay={eventsByDay}
                    categorias={categorias ?? []}
                    isDark={isDark}
                    todayIso={todayIso}
                    currentMonth={anchorDate.getMonth()}
                    onDayClick={(iso) => {
                      setAnchorDate(parseIsoLocal(iso));
                      setView('dia');
                    }}
                    onEventClick={openEdit}
                    onToggleConcluida={toggleConcluida}
                  />
                ))}

              {view === 'semana' && (
                <TimelineView
                  days={isMobile ? [anchorDate] : weekDays}
                  eventsByDay={eventsByDay}
                  categorias={categorias ?? []}
                  isDark={isDark}
                  todayIso={todayIso}
                  onEventClick={openEdit}
                  onResizeCommit={(e, novaHoraFim) => updateItem.mutate({ id: e.id, payload: { horaFim: novaHoraFim } })}
                  onSlotClick={(iso, hora) => openCreate(iso, hora)}
                />
              )}

              {view === 'dia' && (
                <TimelineView
                  days={[anchorDate]}
                  eventsByDay={eventsByDay}
                  categorias={categorias ?? []}
                  isDark={isDark}
                  todayIso={todayIso}
                  onEventClick={openEdit}
                  onResizeCommit={(e, novaHoraFim) => updateItem.mutate({ id: e.id, payload: { horaFim: novaHoraFim } })}
                  onSlotClick={(iso, hora) => openCreate(iso, hora)}
                />
              )}

              {view === 'lista' && (
                <ListView
                  eventos={(geral ?? []).filter((e) => {
                    const term = search.trim().toLowerCase();
                    if (activeCategoryIds.size > 0 && (!e.categoriaId || !activeCategoryIds.has(e.categoriaId))) return false;
                    if (term && !e.titulo.toLowerCase().includes(term)) return false;
                    return true;
                  })}
                  categorias={categorias ?? []}
                  isDark={isDark}
                  onEventClick={(e) => {
                    if (e.origem !== 'AGENDA_ITEM') return;
                    setDrawer({ open: true, item: geralToAgendaItem(e) });
                  }}
                  onToggleConcluida={(e) => toggleConcluida(geralToCalendarEvent(e))}
                />
              )}
            </div>

            {showNotesPanel && !isMobile && (
              <NotesPanel date={notesDateIso} collapsed={notesCollapsed} onToggleCollapse={() => setNotesCollapsed((c) => !c)} />
            )}
          </div>
        </div>
      </DndContext>

      <EventFormDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, item: null })}
        categorias={categorias ?? []}
        usuarios={usuarios ?? []}
        isDark={isDark}
        item={drawer.item}
        defaultDate={drawer.defaultDate}
        defaultHora={drawer.defaultHora}
        onSave={handleSave}
        onDelete={drawer.item ? handleDelete : undefined}
        onDeleteSeries={drawer.item?.recorrenciaId ? handleDeleteSeries : undefined}
        saving={createItem.isPending || updateItem.isPending}
      />

      <DailyReviewDrawer open={reviewOpen} onClose={() => setReviewOpen(false)} date={todayIso} />
    </>
  );
}
