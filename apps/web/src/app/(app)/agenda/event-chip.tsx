'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/cn';
import type { CalendarEvent } from './types';

export function EventChip({
  event,
  cor,
  onClick,
  onToggleConcluida,
  compact,
  dragId,
}: {
  event: CalendarEvent;
  cor: string;
  onClick: () => void;
  onToggleConcluida?: () => void;
  compact?: boolean;
  /** Quando ausente, o chip não é arrastável (eventos de outras origens são só-leitura). */
  dragId?: string;
}) {
  const draggable = useDraggable({
    id: dragId ?? `static-${event.id}`,
    data: { type: 'event', event },
    disabled: !dragId,
  });

  const style = {
    borderLeftColor: cor,
    transform: dragId && draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined,
    opacity: dragId && draggable.isDragging ? 0.4 : undefined,
  };

  return (
    <button
      ref={dragId ? draggable.setNodeRef : undefined}
      {...(dragId ? draggable.listeners : {})}
      {...(dragId ? draggable.attributes : {})}
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-[6px] border-l-[3px] bg-surface px-1.5 py-1 text-left text-[11px] leading-tight text-text shadow-sm transition hover:brightness-95',
        dragId ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        event.concluida && 'opacity-50',
      )}
      title={event.titulo}
    >
      {onToggleConcluida && (
        <input
          type="checkbox"
          checked={event.concluida}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onToggleConcluida();
          }}
          className="shrink-0"
        />
      )}
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      {!compact && event.hora && <span className="shrink-0 font-medium text-text-tertiary">{event.hora}</span>}
      <span className={cn('truncate', event.concluida && 'line-through')}>{event.titulo}</span>
    </button>
  );
}
