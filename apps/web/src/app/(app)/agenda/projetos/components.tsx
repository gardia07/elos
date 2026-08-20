'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronDown, ListChecks, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Drawer } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { AgendaItem, Projeto, ProjetoModelo, ProjetoStatus, Usuario } from '../types';
import { parseIsoUtc } from '../lib';

const CORES = ['#3b82f6', '#8A7FB0', '#c9a227', '#b06a5e', '#2f9e6e', '#5e6ad2'];

/**
 * Área da tarefa, lida do prefixo "[GP] descrição" no título — não é campo novo no
 * schema, é convenção adotada ao popular o backlog do Sistema Elos. Cor própria por
 * área (dot + chip), mesmo princípio de "cor com significado único" já usado nas
 * categorias da Agenda.
 */
export const AREAS: Record<string, { label: string; cor: string; corDark: string }> = {
  GP: { label: 'Gestão de Pessoas', cor: '#3b82f6', corDark: '#6fa8fa' },
  DP: { label: 'Departamento Pessoal', cor: '#8A7FB0', corDark: '#ab9fd0' },
  SST: { label: 'Saúde e Segurança do Trabalho', cor: '#b06a5e', corDark: '#d98b7e' },
  CMP: { label: 'Compliance', cor: '#c9a227', corDark: '#e6c358' },
  IND: { label: 'Indicadores', cor: '#2f9e6e', corDark: '#5cc79a' },
  APR: { label: 'Aprovações', cor: '#5e6ad2', corDark: '#8891e6' },
  FER: { label: 'Ferramentas', cor: '#6d8a3d', corDark: '#92b563' },
  POR: { label: 'Portal do Colaborador', cor: '#4f8a99', corDark: '#7ab3c2' },
  ELO: { label: 'Elô', cor: '#c2578a', corDark: '#e08bb0' },
  CFG: { label: 'Configurações', cor: '#7a7a7a', corDark: '#a3a3a3' },
  INFRA: { label: 'Infraestrutura', cor: '#b5533c', corDark: '#d98a72' },
  PAINEL: { label: 'Área de trabalho', cor: '#a8763e', corDark: '#d1a373' },
};

export function areaDaTarefa(descricao: string): { codigo: string; label: string; cor: string; corDark: string } | null {
  const match = descricao.match(/^\[(\w+)\]/);
  if (!match) return null;
  const area = AREAS[match[1]];
  return area ? { codigo: match[1], ...area } : null;
}

export interface FiltroDropdownOption {
  value: string;
  /** Texto usado para casar com a busca — sem formatação, sem acento exigido. */
  searchText: string;
  render: ReactNode;
}

/**
 * Botão de filtro que abre um popover com busca + lista de opções — usado por Área
 * (multi-seleção) e Marco (seleção única) no Kanban de projeto. Fecha ao clicar fora
 * ou Esc; navegável por teclado (setas + Enter na lista).
 */
export function FiltroDropdown({
  label,
  placeholder,
  options,
  selected,
  multi = false,
  onChange,
  formatSelected,
}: {
  label: string;
  placeholder: string;
  options: FiltroDropdownOption[];
  selected: string[];
  multi?: boolean;
  onChange: (next: string[]) => void;
  formatSelected: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  function abrirOuFechar() {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setBusca('');
        setHighlight(0);
      }
      return next;
    });
  }

  const buscaNormalizada = busca.trim().toLowerCase();
  const filtradas = buscaNormalizada ? options.filter((o) => o.searchText.toLowerCase().includes(buscaNormalizada)) : options;

  function toggle(value: string) {
    if (multi) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange([value]);
      setOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtradas[highlight];
      if (opt) toggle(opt.value);
    }
  }

  const chipTexto =
    selected.length === 0
      ? `${label}: ${placeholder}`
      : selected.length === 1
        ? `${label}: ${formatSelected(selected[0])}`
        : `${label}: ${formatSelected(selected[0])} +${selected.length - 1}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={abrirOuFechar}
        className={cn(
          'flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
          selected.length > 0 ? 'border-accent bg-tint-blue text-accent' : 'border-border-strong text-text-secondary hover:border-text-tertiary',
        )}
      >
        {chipTexto}
        {selected.length > 0 ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }
            }}
            aria-label={`Limpar filtro de ${label}`}
            className="rounded-full p-0.5 hover:bg-accent/20"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-80 rounded-container border border-border bg-surface p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <input
              ref={searchRef}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar…"
              className="w-full rounded-control border border-border-strong bg-page-bg py-1.5 pl-8 pr-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div role="listbox" aria-multiselectable={multi} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {filtradas.length === 0 && <p className="px-2 py-1.5 text-xs text-text-tertiary">Nada encontrado.</p>}
            {filtradas.map((o, i) => {
              const ativo = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => toggle(o.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-control px-2 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                    ativo ? 'bg-tint-blue text-accent' : i === highlight ? 'bg-surface-alt text-text' : 'text-text',
                  )}
                >
                  <span className="min-w-0 flex-1 break-words">{o.render}</span>
                  {ativo && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export interface ProjetoFormValues {
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  cor: string;
  status: ProjetoStatus;
  wipLimiteEmAndamento: string;
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
      wipLimiteEmAndamento: p?.wipLimiteEmAndamento ? String(p.wipLimiteEmAndamento) : '',
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
          <div className="flex flex-col gap-1.5 rounded-container border border-border p-3">
            <span className="text-sm text-text-secondary">Começar a partir de um modelo (opcional)</span>
            <select
              value={values.modeloId}
              onChange={(e) => selecionarModelo(e.target.value)}
              className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
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
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Descrição</span>
          <textarea
            value={values.descricao}
            onChange={(e) => setValues((v) => ({ ...v, descricao: e.target.value }))}
            rows={2}
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
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
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Prazo (opcional)</span>
            <input
              type="date"
              value={values.dataFim}
              onChange={(e) => setValues((v) => ({ ...v, dataFim: e.target.value }))}
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            />
          </label>
        </div>

        {projeto && (
          <div className="flex flex-col gap-1.5 rounded-container border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.status === 'CANCELADO'}
                onChange={(e) => setValues((v) => ({ ...v, status: (e.target.checked ? 'CANCELADO' : 'PLANEJADO') as ProjetoStatus }))}
              />
              <span className="text-text-secondary">Cancelar projeto</span>
            </label>
            <span className="text-xs text-text-tertiary">
              Os demais status (Planejado, Em andamento, Em risco, Concluído) são calculados automaticamente a partir do progresso das tarefas, marcos e prazos.
            </span>
          </div>
        )}

        {projeto && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Limite de WIP em &quot;Em andamento&quot;</span>
            <input
              type="number"
              min={1}
              value={values.wipLimiteEmAndamento}
              onChange={(e) => setValues((v) => ({ ...v, wipLimiteEmAndamento: e.target.value }))}
              placeholder="Sem limite"
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            />
            <span className="text-xs text-text-tertiary">
              Aviso visual (não trava o quadro) quando a coluna &quot;Em andamento&quot; passar desse número — ajuda a evitar começar tarefa demais ao mesmo tempo.
            </span>
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
              className="w-24 rounded-control border border-border-strong bg-surface px-2 py-1 text-xs uppercase text-text"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-text-secondary">Participantes</span>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-container border border-border p-2">
            {usuarios.map((u) => {
              const checked = values.participanteIds.includes(u.id);
              const souEu = u.id === currentUserId;
              return (
                <label key={u.id} className="flex items-center gap-2 rounded-control px-1.5 py-1 text-sm hover:bg-surface-alt">
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
                <div key={t.id} className="flex items-center gap-2 rounded-container bg-surface-alt px-2.5 py-1.5 text-sm">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', t.concluida ? 'bg-success' : 'bg-border-strong')} />
                  <span className={cn('flex-1', t.concluida && 'text-text-tertiary line-through')}>{t.descricao}</span>
                  <span className="text-xs text-text-tertiary">{parseIsoUtc(t.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {projeto?.atrasado && (
          <div className="flex items-center gap-1.5 rounded-container bg-danger/10 px-3 py-2 text-xs text-danger">
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
            <Button type="button" variant="cancel" onClick={onClose}>
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
