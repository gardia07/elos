'use client';

import { useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import { categoriaCor, HORA_FIM, HORA_INICIO, horaToMinutos, minutosToHora } from './lib';
import type { CalendarEvent, Categoria } from './types';
import { HUB_FALLBACK_COLOR } from './types';

const ROW_HEIGHT = 48; // px por hora
const TOTAL_MIN = (HORA_FIM - HORA_INICIO) * 60;
const TOTAL_HEIGHT = (HORA_FIM - HORA_INICIO) * ROW_HEIGHT;
const HOURS = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

function topFor(hora: string): number {
  const min = Math.max(0, horaToMinutos(hora) - HORA_INICIO * 60);
  return (min / TOTAL_MIN) * TOTAL_HEIGHT;
}

function heightFor(hora: string, horaFim: string | null): number {
  const start = horaToMinutos(hora);
  const end = horaFim ? horaToMinutos(horaFim) : start + 30;
  const durMin = Math.max(15, end - start);
  return Math.max(18, (durMin / TOTAL_MIN) * TOTAL_HEIGHT);
}

function TimedBlock({
  event,
  cor,
  onClick,
  onResizeCommit,
}: {
  event: CalendarEvent;
  cor: string;
  onClick: () => void;
  onResizeCommit: (novaHoraFim: string) => void;
}) {
  const dragId = event.editable ? `event:${event.id}` : undefined;
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: dragId ?? `static-${event.id}`,
    data: { type: 'event', event },
    disabled: !dragId,
  });
  const [resizing, setResizing] = useState(false);
  const [ghostHeight, setGhostHeight] = useState<number | null>(null);
  const startYRef = useRef(0);
  const startMinRef = useRef(0);
  const justResizedRef = useRef(false);

  const top = event.hora ? topFor(event.hora) : 0;
  const height = ghostHeight ?? heightFor(event.hora ?? '06:00', event.horaFim);

  function onResizePointerDown(e: React.PointerEvent) {
    if (!event.editable || !event.hora) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setResizing(true);
    startYRef.current = e.clientY;
    startMinRef.current = horaToMinutos(event.horaFim ?? minutosToHora(horaToMinutos(event.hora) + 30));
  }
  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizing) return;
    const deltaPx = e.clientY - startYRef.current;
    const deltaMin = Math.round((deltaPx / TOTAL_HEIGHT) * TOTAL_MIN / 15) * 15;
    const startMin = horaToMinutos(event.hora ?? '06:00');
    const newEndMin = Math.max(startMin + 15, startMinRef.current + deltaMin);
    setGhostHeight(Math.max(18, ((newEndMin - startMin) / TOTAL_MIN) * TOTAL_HEIGHT));
  }
  function onResizePointerUp(e: React.PointerEvent) {
    if (!resizing) return;
    setResizing(false);
    justResizedRef.current = true;
    const deltaPx = e.clientY - startYRef.current;
    const deltaMin = Math.round((deltaPx / TOTAL_HEIGHT) * TOTAL_MIN / 15) * 15;
    const newEndMin = Math.max(startMinRef.current + deltaMin, horaToMinutos(event.hora ?? '06:00') + 15);
    setGhostHeight(null);
    if (deltaMin !== 0) onResizeCommit(minutosToHora(newEndMin));
  }

  return (
    <button
      ref={dragId ? setNodeRef : undefined}
      {...(dragId ? listeners : {})}
      {...(dragId ? attributes : {})}
      type="button"
      onClick={() => {
        if (justResizedRef.current) {
          justResizedRef.current = false;
          return;
        }
        onClick();
      }}
      style={{
        top,
        height,
        borderLeftColor: cor,
        transform: dragId && transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: (dragId && isDragging) ? 0.4 : 1,
        zIndex: resizing ? 20 : 1,
      }}
      className={cn(
        'absolute left-0.5 right-0.5 overflow-hidden rounded-[6px] border-l-[3px] bg-surface px-1.5 py-1 text-left text-[11px] leading-tight text-text shadow-sm',
        dragId ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        event.concluida && 'opacity-50 line-through',
      )}
      title={event.titulo}
    >
      {event.hora && <span className="mr-1 font-medium text-text-tertiary">{event.hora}</span>}
      {event.titulo}
      {event.editable && event.hora && (
        <div
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
        />
      )}
    </button>
  );
}

function HourSlot({ iso, hora }: { iso: string; hora: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${iso}:${hora}`, data: { type: 'slot', iso, hora } });
  return <div ref={setNodeRef} className={cn('border-t border-divider', isOver && 'bg-tint-blue')} style={{ height: ROW_HEIGHT }} />;
}

export function TimelineView({
  days,
  eventsByDay,
  categorias,
  isDark,
  todayIso,
  onEventClick,
  onResizeCommit,
  onSlotClick,
}: {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  categorias: Categoria[];
  isDark: boolean;
  todayIso: string;
  onEventClick: (e: CalendarEvent) => void;
  onResizeCommit: (e: CalendarEvent, novaHoraFim: string) => void;
  onSlotClick: (iso: string, hora: string) => void;
}) {
  const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="flex border-b border-divider">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const iso = isoOf(d);
          const isToday = iso === todayIso;
          const allDay = (eventsByDay.get(iso) ?? []).filter((e) => !e.hora);
          return (
            <div key={iso} className="flex-1 border-l border-divider px-1.5 py-1.5">
              <div className={cn('mb-1 text-center text-xs font-medium', isToday ? 'text-accent' : 'text-text-secondary')}>
                {d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
              </div>
              {allDay.map((e) => {
                const cor = e.categoriaId
                  ? categoriaCor(categorias.find((c) => c.id === e.categoriaId), isDark)
                  : HUB_FALLBACK_COLOR[e.hub ?? ''] ?? '#a89c8d';
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEventClick(e)}
                    className="mb-1 flex w-full items-center gap-1.5 rounded-[6px] border-l-[3px] bg-surface px-1.5 py-1 text-left text-[11px] text-text"
                    style={{ borderLeftColor: cor }}
                  >
                    {e.titulo}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-1">
        <div className="w-14 shrink-0">
          {HOURS.map((h) => (
            <div key={h} className="relative text-right text-[10.5px] text-text-tertiary" style={{ height: ROW_HEIGHT }}>
              <span className="relative -top-2 pr-1.5">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        {days.map((d) => {
          const iso = isoOf(d);
          const timed = (eventsByDay.get(iso) ?? []).filter((e) => e.hora);
          return (
            <div key={iso} className="relative flex-1 border-l border-divider" style={{ height: TOTAL_HEIGHT }}>
              {HOURS.slice(0, -1).map((h) => (
                <div key={h} onClick={() => onSlotClick(iso, `${String(h).padStart(2, '0')}:00`)}>
                  <HourSlot iso={iso} hora={`${String(h).padStart(2, '0')}:00`} />
                </div>
              ))}
              {timed.map((e) => {
                const cor = e.categoriaId
                  ? categoriaCor(categorias.find((c) => c.id === e.categoriaId), isDark)
                  : HUB_FALLBACK_COLOR[e.hub ?? ''] ?? '#a89c8d';
                return (
                  <TimedBlock
                    key={e.id}
                    event={e}
                    cor={cor}
                    onClick={() => onEventClick(e)}
                    onResizeCommit={(novaHoraFim) => onResizeCommit(e, novaHoraFim)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
