'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ListChecks, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Drawer } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { AgendaItem, Projeto, ProjetoModelo, ProjetoStatus, Usuario } from '../types';
import { PROJETO_STATUS_LABEL } from '../types';
import { parseIsoUtc } from '../lib';

const STATUS_OPCOES: ProjetoStatus[] = ['PLANEJADO', 'EM_ANDAMENTO', 'EM_RISCO', 'CONCLUIDO', 'CANCELADO'];
const CORES = ['#3b82f6', '#8A7FB0', '#c9a227', '#b06a5e', '#2f9e6e', '#5e6ad2'];

export interface ProjetoFormValues {
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  cor: string;
  status: ProjetoStatus;
  participanteIds: string[];
  modeloId: string;
}

export function ProjetoDrawer({
  open,
  onClose,
  usuarios,
  currentUserId,
  projeto,
  onSave,
  onDelete,
  onSetParticipantes,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  usuarios: Usuario[];
  currentUserId?: string;
  projeto?: Projeto | null;
  onSave: (values: ProjetoFormValues) => void;
  onDelete?: () => void;
  onSetParticipantes: (participanteIds: string[]) => void;
  saving?: boolean;
}) {
  const [values, setValues] = useState<ProjetoFormValues>(() => buildInitial(projeto));

  useEffect(() => {
    if (open) setValues(buildInitial(projeto));
  }, [open, projeto]);

  function buildInitial(p?: Projeto | null): ProjetoFormValues {
    return {
      nome: p?.nome ?? '',
      descricao: p?.descricao ?? '',
      dataInicio: p?.dataInicio.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      dataFim: p?.dataFim?.slice(0, 10) ?? '',
      cor: p?.cor ?? CORES[0],
      status: p?.status ?? 'PLANEJADO',
      participanteIds: p?.participantes.map((pp) => pp.userId) ?? [],
      modeloId: '',
    };
  }

  const podeExcluir = !!projeto && !!onDelete && (!currentUserId || projeto.criadoPorId === currentUserId);

  const { data: tarefas } = useQuery({
    queryKey: ['agenda', 'projetos', projeto?.id, 'tarefas'],
    queryFn: async () => (await api.get<AgendaItem[]>(`/agenda/projetos/${projeto!.id}/tarefas`)).data,
    enabled: !!projeto,
  });

  const queryClient = useQueryClient();
  const { data: modelos } = useQuery({
    queryKey: ['agenda', 'projetos', 'modelos'],
    queryFn: async () => (await api.get<ProjetoModelo[]>('/agenda/projetos/modelos')).data,
    enabled: !projeto && open,
  });
  const excluirModelo = useMutation({
    mutationFn: async (id: string) => api.delete(`/agenda/projetos/modelos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos', 'modelos'] }),
  });

  function selecionarModelo(modeloId: string) {
    const modelo = modelos?.find((m) => m.id === modeloId);
    setValues((v) => ({
      ...v,
      modeloId,
      ...(modelo ? { nome: v.nome || modelo.nome, descricao: v.descricao || (modelo.descricao ?? ''), cor: modelo.cor } : {}),
    }));
  }

  function toggleParticipante(userId: string) {
    setValues((v) => {
      const ativo = v.participanteIds.includes(userId);
      const next = ativo ? v.participanteIds.filter((id) => id !== userId) : [...v.participanteIds, userId];
      onSetParticipantes(next);
      return { ...v, participanteIds: next };
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title={projeto ? 'Editar projeto' : 'Novo projeto'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
      >
        {!projeto && (modelos?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-border p-3">
            <span className="text-sm text-text-secondary">Começar a partir de um modelo (opcional)</span>
            <select
              value={values.modeloId}
              onChange={(e) => selecionarModelo(e.target.value)}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="">Projeto em branco</option>
              {modelos?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.tarefas.length} tarefas, {m.marcos.length} marcos)
                </option>
              ))}
            </select>
            {values.modeloId && (
              <div className="flex flex-wrap gap-1.5">
                {modelos
                  ?.filter((m) => m.id === values.modeloId)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        excluirModelo.mutate(m.id);
                        setValues((v) => ({ ...v, modeloId: '' }));
                      }}
                      className="flex items-center gap-1 text-xs text-danger hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir modelo &quot;{m.nome}&quot;
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Nome do projeto</span>
          <input
            value={values.nome}
            onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))}
            required
            autoFocus
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Descrição</span>
          <textarea
            value={values.descricao}
            onChange={(e) => setValues((v) => ({ ...v, descricao: e.target.value }))}
            rows={2}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Início</span>
            <input
              type="date"
              value={values.dataInicio}
              onChange={(e) => setValues((v) => ({ ...v, dataInicio: e.target.value }))}
              required
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Prazo (opcional)</span>
            <input
              type="date"
              value={values.dataFim}
              onChange={(e) => setValues((v) => ({ ...v, dataFim: e.target.value }))}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
        </div>

        {projeto && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Status</span>
            <select
              value={values.status}
              onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ProjetoStatus }))}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>
                  {PROJETO_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <span className="mb-1.5 block text-sm text-text-secondary">Cor</span>
          <div className="flex flex-wrap items-center gap-2">
            {CORES.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => setValues((v) => ({ ...v, cor }))}
                className={cn('h-7 w-7 rounded-full border-2', values.cor === cor ? 'border-text' : 'border-transparent')}
                style={{ backgroundColor: cor }}
                aria-label={`Cor ${cor}`}
              />
            ))}
            <label
              className={cn(
                'relative h-7 w-7 shrink-0 cursor-pointer rounded-full border-2',
                !CORES.includes(values.cor) ? 'border-text' : 'border-dashed border-border-strong',
              )}
              style={!CORES.includes(values.cor) ? { backgroundColor: values.cor } : undefined}
              aria-label="Escolher outra cor"
              title="Escolher outra cor"
            >
              <input
                type="color"
                value={values.cor}
                onChange={(e) => setValues((v) => ({ ...v, cor: e.target.value }))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              value={values.cor}
              onChange={(e) => setValues((v) => ({ ...v, cor: e.target.value }))}
              placeholder="#3b82f6"
              spellCheck={false}
              className="w-24 rounded-[8px] border border-border-strong bg-surface px-2 py-1 text-xs uppercase text-text"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-text-secondary">Participantes</span>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[10px] border border-border p-2">
            {usuarios.map((u) => {
              const checked = values.participanteIds.includes(u.id);
              const souEu = u.id === currentUserId;
              return (
                <label key={u.id} className="flex items-center gap-2 rounded-[8px] px-1.5 py-1 text-sm hover:bg-surface-alt">
                  <input
                    type="checkbox"
                    checked={checked || souEu}
                    disabled={souEu}
                    onChange={() => !souEu && (projeto ? toggleParticipante(u.id) : setValues((v) => ({ ...v, participanteIds: checked ? v.participanteIds.filter((id) => id !== u.id) : [...v.participanteIds, u.id] })))}
                  />
                  {u.name}
                  {souEu && <span className="text-xs text-text-tertiary">(você)</span>}
                </label>
              );
            })}
          </div>
        </div>

        {projeto && (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <ListChecks className="h-3.5 w-3.5" /> Tarefas vinculadas ({projeto.tarefasConcluidas}/{projeto.totalTarefas})
            </span>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {(tarefas ?? []).length === 0 && <p className="text-xs text-text-tertiary">Nenhuma tarefa vinculada ainda. Vincule ao criar/editar um item na Agenda.</p>}
              {(tarefas ?? []).map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-[8px] bg-surface-alt px-2.5 py-1.5 text-sm">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', t.concluida ? 'bg-success' : 'bg-border-strong')} />
                  <span className={cn('flex-1', t.concluida && 'text-text-tertiary line-through')}>{t.descricao}</span>
                  <span className="text-xs text-text-tertiary">{parseIsoUtc(t.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {projeto?.atrasado && (
          <div className="flex items-center gap-1.5 rounded-[10px] bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5" /> Este projeto passou do prazo e ainda não foi concluído.
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          {podeExcluir ? (
            <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-sm text-danger hover:underline">
              <Trash2 className="h-4 w-4" /> Excluir projeto
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
