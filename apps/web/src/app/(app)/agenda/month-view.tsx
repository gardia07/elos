'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import { EventChip } from './event-chip';
import { categoriaCor } from './lib';
import type { CalendarEvent, Categoria } from './types';
import { HUB_FALLBACK_COLOR } from './types';

const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_VISIVEL = 3;

function DayCell({
  date,
  iso,
  isCurrentMonth,
  isToday,
  events,
  categorias,
  isDark,
  onDayClick,
  onEventClick,
  onToggleConcluida,
}: {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  categorias: Categoria[];
  isDark: boolean;
  onDayClick: (iso: string) => void;
  onEventClick: (e: CalendarEvent) => void;
  onToggleConcluida: (e: CalendarEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}`, data: { type: 'day', iso } });
  const visiveis = events.slice(0, MAX_VISIVEL);
  const resto = events.length - visiveis.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[104px] flex-col gap-1 border-b border-r border-divider p-1.5 transition',
        !isCurrentMonth && 'bg-surface-alt/50',
        isOver && 'bg-tint-blue',
      )}
    >
      <button
        type="button"
        onClick={() => onDayClick(iso)}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium',
          isToday ? 'bg-accent text-on-accent' : isCurrentMonth ? 'text-text' : 'text-text-tertiary',
        )}
      >
        {date.getDate()}
      </button>
      <div className="flex flex-col gap-1">
        {visiveis.map((e) => {
          const cor = e.categoriaId
            ? categoriaCor(categorias.find((c) => c.id === e.categoriaId), isDark)
            : HUB_FALLBACK_COLOR[e.hub ?? ''] ?? '#a89c8d';
          return (
            <EventChip
              key={e.id}
              event={e}
              cor={cor}
              compact
              dragId={e.editable ? `event:${e.id}` : undefined}
              onClick={() => onEventClick(e)}
              onToggleConcluida={() => onToggleConcluida(e)}
            />
          );
        })}
        {resto > 0 && (
          <button type="button" onClick={() => onDayClick(iso)} className="text-left text-[10.5px] font-medium text-accent hover:underline">
            + {resto} mais
          </button>
        )}
      </div>
    </div>
  );
}

export function MonthView({
  weeks,
  eventsByDay,
  categorias,
  isDark,
  todayIso,
  currentMonth,
  onDayClick,
  onEventClick,
  onToggleConcluida,
}: {
  weeks: Date[][];
  eventsByDay: Map<string, CalendarEvent[]>;
  categorias: Categoria[];
  isDark: boolean;
  todayIso: string;
  currentMonth: number;
  onDayClick: (iso: string) => void;
  onEventClick: (e: CalendarEvent) => void;
  onToggleConcluida: (e: CalendarEvent) => void;
}) {
  return (
    <div className="scroll-suave flex flex-1 flex-col overflow-auto">
      <div className="grid grid-cols-7 border-l border-t border-divider">
        {DIA_SEMANA.map((d) => (
          <div key={d} className="border-b border-r border-divider bg-surface-alt px-2 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 border-l border-divider">
        {weeks.map((week) =>
          week.map((date) => {
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return (
              <DayCell
                key={iso}
                date={date}
                iso={iso}
                isCurrentMonth={date.getMonth() === currentMonth}
                isToday={iso === todayIso}
                events={eventsByDay.get(iso) ?? []}
                categorias={categorias}
                isDark={isDark}
                onDayClick={onDayClick}
                onEventClick={onEventClick}
                onToggleConcluida={onToggleConcluida}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
