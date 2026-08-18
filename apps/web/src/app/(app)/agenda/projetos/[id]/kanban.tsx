'use client';

import { AlertTriangle, Link2 } from 'lucide-react';
import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import type { AgendaItem, TarefaProjetoStatus } from '../../types';
import { PRIORIDADE_COR, PRIORIDADE_LABEL, TAREFA_PROJETO_STATUS_LABEL } from '../../types';
import { parseIsoUtc } from '../../lib';
import { areaDaTarefa } from '../components';

const COLUNAS: TarefaProjetoStatus[] = ['A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA'];

function TaskCard({ tarefa, bloqueadora, isDark, onClick }: { tarefa: AgendaItem; bloqueadora?: AgendaItem; isDark: boolean; onClick: () => void }) {
  const draggable = useDraggable({ id: tarefa.id, data: { tarefa } });
  const style = {
    transform: draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined,
    opacity: draggable.isDragging ? 0.4 : undefined,
  };
  const area = areaDaTarefa(tarefa.descricao);
  const bloqueadaAtiva = !!bloqueadora && !bloqueadora.concluida;

  return (
    <button
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      type="button"
      onClick={onClick}
      style={style}
      className="flex w-full cursor-grab flex-col gap-1.5 rounded-[10px] border border-border bg-surface p-2.5 text-left text-sm shadow-sm transition hover:border-accent active:cursor-grabbing"
    >
      <span className={cn(tarefa.concluida && 'text-text-tertiary line-through')}>{tarefa.descricao}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-tertiary">{parseIsoUtc(tarefa.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
        {area && (
          <span
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium"
            style={{ backgroundColor: `${isDark ? area.corDark : area.cor}1f`, color: isDark ? area.corDark : area.cor }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isDark ? area.corDark : area.cor }} />
            {area.codigo}
          </span>
        )}
        {tarefa.prioridade && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10.5px] font-medium"
            style={{ backgroundColor: `${PRIORIDADE_COR[tarefa.prioridade]}1f`, color: PRIORIDADE_COR[tarefa.prioridade] }}
            title={PRIORIDADE_LABEL[tarefa.prioridade]}
          >
            {tarefa.prioridade}
          </span>
        )}
        {bloqueadaAtiva && (
          <span className="flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-[10.5px] font-medium text-warning" title={`Bloqueada por: ${bloqueadora!.descricao}`}>
            <Link2 className="h-3 w-3" /> Bloqueada
          </span>
        )}
      </div>
    </button>
  );
}

function Coluna({
  status,
  tarefas,
  tarefasPorId,
  isDark,
  wipLimite,
  onCardClick,
}: {
  status: TarefaProjetoStatus;
  tarefas: AgendaItem[];
  tarefasPorId: Map<string, AgendaItem>;
  isDark: boolean;
  wipLimite?: number | null;
  onCardClick: (t: AgendaItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });
  const excedeWip = !!wipLimite && tarefas.length > wipLimite;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[220px] flex-1 flex-col gap-2 rounded-[10px] border border-border bg-page-bg p-3 transition',
        isOver && 'border-accent bg-tint-blue',
        excedeWip && 'border-warning',
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{TAREFA_PROJETO_STATUS_LABEL[status]}</span>
        <span className={cn('flex items-center gap-1 text-xs', excedeWip ? 'font-semibold text-warning' : 'text-text-tertiary')}>
          {excedeWip && <AlertTriangle className="h-3 w-3" />}
          {tarefas.length}
          {wipLimite ? ` / ${wipLimite}` : ''}
        </span>
      </div>
      <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto pr-0.5">
        {tarefas.map((t) => (
          <TaskCard key={t.id} tarefa={t} bloqueadora={t.bloqueadoPorId ? tarefasPorId.get(t.bloqueadoPorId) : undefined} isDark={isDark} onClick={() => onCardClick(t)} />
        ))}
        {tarefas.length === 0 && <p className="px-1 text-xs text-text-tertiary">Arraste uma tarefa para cá.</p>}
      </div>
    </div>
  );
}

export function ProjetoKanban({
  projetoId,
  tarefas,
  todasTarefas,
  wipLimite,
  isDark,
  onCardClick,
}: {
  projetoId: string;
  tarefas: AgendaItem[];
  todasTarefas?: AgendaItem[];
  wipLimite?: number | null;
  isDark: boolean;
  onCardClick: (t: AgendaItem) => void;
}) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const tarefasPorId = new Map((todasTarefas ?? tarefas).map((t) => [t.id, t]));

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
          <Coluna
            key={status}
            status={status}
            tarefas={porStatus(status)}
            tarefasPorId={tarefasPorId}
            isDark={isDark}
            wipLimite={status === 'EM_ANDAMENTO' ? wipLimite : undefined}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DndContext>
  );
}
