'use client';

import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import type { AgendaItem, TarefaProjetoStatus } from '../../types';
import { TAREFA_PROJETO_STATUS_LABEL } from '../../types';
import { parseIsoUtc } from '../../lib';

const COLUNAS: TarefaProjetoStatus[] = ['A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA'];

function TaskCard({ tarefa, onClick }: { tarefa: AgendaItem; onClick: () => void }) {
  const draggable = useDraggable({ id: tarefa.id, data: { tarefa } });
  const style = {
    transform: draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined,
    opacity: draggable.isDragging ? 0.4 : undefined,
  };

  return (
    <button
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      type="button"
      onClick={onClick}
      style={style}
      className="flex w-full cursor-grab flex-col gap-1 rounded-[10px] border border-border bg-surface p-2.5 text-left text-sm shadow-sm transition hover:border-accent active:cursor-grabbing"
    >
      <span className={cn(tarefa.concluida && 'text-text-tertiary line-through')}>{tarefa.descricao}</span>
      <span className="text-xs text-text-tertiary">{parseIsoUtc(tarefa.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
    </button>
  );
}

function Coluna({ status, tarefas, onCardClick }: { status: TarefaProjetoStatus; tarefas: AgendaItem[]; onCardClick: (t: AgendaItem) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });

  return (
    <div
      ref={setNodeRef}
      className={cn('flex min-h-[220px] flex-1 flex-col gap-2 rounded-[12px] border border-border bg-page-bg p-3 transition', isOver && 'border-accent bg-tint-blue')}
    >
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{TAREFA_PROJETO_STATUS_LABEL[status]}</span>
        <span className="text-xs text-text-tertiary">{tarefas.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tarefas.map((t) => (
          <TaskCard key={t.id} tarefa={t} onClick={() => onCardClick(t)} />
        ))}
        {tarefas.length === 0 && <p className="px-1 text-xs text-text-tertiary">Arraste uma tarefa para cá.</p>}
      </div>
    </div>
  );
}

export function ProjetoKanban({ projetoId, tarefas, onCardClick }: { projetoId: string; tarefas: AgendaItem[]; onCardClick: (t: AgendaItem) => void }) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updateStatus = useMutation({
    mutationFn: async (vars: { id: string; statusProjeto: TarefaProjetoStatus }) => api.patch(`/agenda/items/${vars.id}`, { statusProjeto: vars.statusProjeto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos', projetoId, 'tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos'] });
    },
  });

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over) return;
    const overData = over.data.current as { status: TarefaProjetoStatus } | undefined;
    const activeData = active.data.current as { tarefa: AgendaItem } | undefined;
    if (!overData || !activeData) return;
    if ((activeData.tarefa.statusProjeto ?? 'A_FAZER') === overData.status) return;
    updateStatus.mutate({ id: activeData.tarefa.id, statusProjeto: overData.status });
  }

  const porStatus = (status: TarefaProjetoStatus) => tarefas.filter((t) => (t.statusProjeto ?? 'A_FAZER') === status);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {COLUNAS.map((status) => (
          <Coluna key={status} status={status} tarefas={porStatus(status)} onCardClick={onCardClick} />
        ))}
      </div>
    </DndContext>
  );
}
