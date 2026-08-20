'use client';

import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { GripVertical, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDiaLongoIso } from './lib';

function NoteLine({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type: 'note-line', text } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-start gap-1.5 rounded-container border border-border bg-surface-alt px-2 py-1.5 text-xs text-text active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
      title="Arraste para um horário do calendário para transformar em item de agenda"
    >
      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-text-tertiary" />
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}

export function NotesPanel({ date, collapsed, onToggleCollapse }: { date: string; collapsed: boolean; onToggleCollapse: () => void }) {
  const [conteudo, setConteudo] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Uma vez que a pessoa edita o campo, ele vira a fonte da verdade pro resto da
  // sessão nessa data — nunca mais sobrescrito por uma busca em segundo plano
  // (ex.: reconexão, foco na aba). Some no botão comum: por design, cada data
  // tem seu próprio bloco de notas, então resetamos ao trocar de dia.
  const editadoLocalmenteRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['agenda', 'notepad', date],
    queryFn: async () => (await api.get<{ conteudo: string }>(`/agenda/notepad/${date}`)).data,
  });

  useEffect(() => {
    editadoLocalmenteRef.current = false;
    setPendingSave(false);
  }, [date]);

  useEffect(() => {
    if (editadoLocalmenteRef.current) return;
    setConteudo(data?.conteudo ?? '');
  }, [data]);

  const save = useMutation({
    mutationFn: async (texto: string) => api.put(`/agenda/notepad/${date}`, { conteudo: texto }),
    onSuccess: () => setPendingSave(false),
  });

  function handleChange(value: string) {
    editadoLocalmenteRef.current = true;
    setConteudo(value);
    setPendingSave(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save.mutate(value), 800);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden h-full w-10 shrink-0 items-center justify-center border-l border-divider bg-page-bg text-text-tertiary hover:text-text md:flex"
        aria-label="Mostrar painel de notas"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  const lines = conteudo.split('\n').map((t, i) => ({ id: `note-line-${date}-${i}`, text: t.trim() })).filter((l) => l.text.length > 0);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-l border-divider bg-page-bg p-4 md:w-72">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Notas — {formatDiaLongoIso(date)}</h3>
        <button type="button" onClick={onToggleCollapse} className="hidden text-text-tertiary hover:text-text md:block" aria-label="Recolher painel de notas">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={conteudo}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Anotações livres do dia — uma ideia por linha…"
        rows={8}
        className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
      />
      <span className="text-[11px] text-text-tertiary">{save.isPending || pendingSave ? 'Salvando…' : 'Salvo'}</span>

      {lines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Arraste para agendar</span>
          {lines.map((l) => (
            <NoteLine key={l.id} id={l.id} text={l.text} />
          ))}
        </div>
      )}
    </aside>
  );
}
