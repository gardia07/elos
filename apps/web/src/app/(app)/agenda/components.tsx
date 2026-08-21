'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, ChevronDown, ChevronLeft, ChevronRight, ListChecks, Moon, Plus, Repeat, Search, Send, StickyNote, Trash2, UserRound, Users, PartyPopper } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Drawer } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { AgendaItem, AgendaItemPrioridade, AgendaItemTipo, AgendaRecorrenciaFrequencia, AgendaView, AuditEvento, Categoria, Comentario, Projeto, RecorrenciaInput, Subtarefa, Usuario } from './types';
import { DIA_SEMANA_CODES, DIA_SEMANA_LABEL, DIA_SEMANA_LABEL_LONGO, FREQUENCIA_LABEL, PRIORIDADE_LABEL, TIPO_LABEL } from './types';
import { addAnosIso, categoriaCor, localIso, parseIsoLocal } from './lib';

export const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle,
  Users,
  PartyPopper,
  StickyNote,
};

export function CategoriaIcon({ nome, className, style }: { nome: string; className?: string; style?: CSSProperties }) {
  const Icon = ICON_MAP[nome] ?? StickyNote;
  return <Icon className={className} style={style} />;
}

const VIEW_LABEL: Record<AgendaView, string> = { mes: 'Mês', semana: 'Semana', dia: 'Dia', lista: 'Lista' };

export function AgendaHeader({
  view,
  onViewChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  onNew,
  onOpenReview,
  search,
  onSearchChange,
}: {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  onOpenReview: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-divider bg-page-bg px-4 py-4 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-control border border-border-strong bg-surface p-1">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-control p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToday} className="rounded-control px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-alt">
            Hoje
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-control p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text"
            aria-label="Próximo período"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-sm font-semibold capitalize text-text">{periodLabel}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-control border border-border-strong bg-surface p-1">
          {(Object.keys(VIEW_LABEL) as AgendaView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                'rounded-control px-3 py-1.5 text-xs font-medium transition',
                view === v ? 'bg-accent text-on-accent' : 'text-text-secondary hover:bg-surface-alt',
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar…"
            className="w-40 rounded-control border border-border-strong bg-surface py-2 pl-8 pr-3 text-sm"
          />
        </div>

        <Button variant="secondary" onClick={onOpenReview} className="flex items-center gap-1.5">
          <Moon className="h-4 w-4" /> Revisão do dia
        </Button>

        <Button variant="add" onClick={onNew} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>
    </div>
  );
}

export function CategoryLegend({
  categorias,
  isDark,
  activeIds,
  onToggle,
}: {
  categorias: Categoria[];
  isDark: boolean;
  activeIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-divider bg-page-bg px-4 pb-4 pt-3 sm:px-8">
      {categorias.map((c) => {
        const cor = categoriaCor(c, isDark);
        const active = activeIds.size === 0 || activeIds.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition',
              active ? 'border-border-strong bg-surface text-text' : 'border-border bg-surface-alt text-text-tertiary opacity-60',
            )}
          >
            <CategoriaIcon nome={c.icone} className="h-3.5 w-3.5" style={{ color: cor }} />
            {c.nome}
          </button>
        );
      })}
    </div>
  );
}

export interface EventFormValues {
  data: string;
  hora: string;
  horaFim: string;
  diaInteiro: boolean;
  descricao: string;
  notas: string;
  tipo: AgendaItemTipo;
  categoriaId: string;
  responsavelId: string;
  projetoId: string;
  prioridade: AgendaItemPrioridade | '';
  bloqueadoPorId: string;
  repetir: boolean;
  frequencia: AgendaRecorrenciaFrequencia;
  intervalo: number;
  diasDaSemana: string[];
  posicaoNoMes: number;
  dataFimRecorrencia: string;
  lembretes: number[];
  lembreteEmail: boolean;
}

const LEMBRETE_ANTECEDENCIA_LABEL: Record<number, string> = { 0: 'No dia', 1: '1 dia antes', 7: '1 semana antes' };
const LEMBRETE_ANTECEDENCIAS = [0, 1, 7];

export function lembretesInputFromValues(v: EventFormValues) {
  return { antecedencias: v.lembretes, email: v.lembreteEmail };
}

const UNIDADE_INTERVALO: Record<AgendaRecorrenciaFrequencia, string> = {
  DIARIA: 'dia(s)',
  SEMANAL: 'semana(s)',
  MENSAL: 'mês(es)',
  ANUAL: 'ano(s)',
  PERSONALIZADA: '',
};

const POSICAO_LABEL: Record<number, string> = { 1: '1ª', 2: '2ª', 3: '3ª', 4: '4ª', [-1]: 'última' };

export function recorrenciaFromValues(v: EventFormValues): RecorrenciaInput | undefined {
  if (!v.repetir) return undefined;
  return {
    frequencia: v.frequencia,
    intervalo: v.frequencia === 'PERSONALIZADA' ? undefined : v.intervalo,
    diasDaSemana: v.frequencia === 'SEMANAL' || v.frequencia === 'PERSONALIZADA' ? v.diasDaSemana : undefined,
    posicaoNoMes: v.frequencia === 'PERSONALIZADA' ? v.posicaoNoMes : undefined,
    dataFim: v.dataFimRecorrencia,
  };
}

export function EventFormDrawer({
  open,
  onClose,
  categorias,
  usuarios,
  projetos,
  tarefasDoProjeto,
  isDark,
  item,
  defaultDate,
  defaultHora,
  defaultProjetoId,
  onSave,
  onDelete,
  onDeleteSeries,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  categorias: Categoria[];
  usuarios: Usuario[];
  projetos: Projeto[];
  tarefasDoProjeto?: AgendaItem[];
  isDark: boolean;
  item?: AgendaItem | null;
  defaultDate?: string;
  defaultHora?: string;
  defaultProjetoId?: string;
  onSave: (values: EventFormValues) => void;
  onDelete?: () => void;
  onDeleteSeries?: () => void;
  saving?: boolean;
}) {
  const [values, setValues] = useState<EventFormValues>(() => buildInitial(item, defaultDate, defaultHora));

  useEffect(() => {
    if (open) setValues(buildInitial(item, defaultDate, defaultHora));
  }, [open, item, defaultDate, defaultHora]);

  function buildInitial(it?: AgendaItem | null, date?: string, hora?: string): EventFormValues {
    const data = it?.data.slice(0, 10) ?? date ?? localIso(new Date());
    return {
      data,
      hora: it?.hora ?? hora ?? '',
      horaFim: it?.horaFim ?? '',
      diaInteiro: it ? !it.hora : !hora,
      descricao: it?.descricao ?? '',
      notas: it?.notas ?? '',
      tipo: it?.tipo ?? 'TAREFA',
      categoriaId: it?.categoriaId ?? '',
      responsavelId: it?.responsavelId ?? '',
      projetoId: it?.projetoId ?? defaultProjetoId ?? '',
      prioridade: it?.prioridade ?? '',
      bloqueadoPorId: it?.bloqueadoPorId ?? '',
      repetir: false,
      frequencia: 'SEMANAL',
      intervalo: 1,
      diasDaSemana: [],
      posicaoNoMes: -1,
      dataFimRecorrencia: addAnosIso(data, 1),
      lembretes: it?.lembretes?.map((l) => l.antecedenciaDias) ?? [],
      lembreteEmail: it?.lembretes?.some((l) => l.notificarEmail) ?? false,
    };
  }

  return (
    <Drawer open={open} onClose={onClose} title={item ? 'Editar item' : 'Novo item de agenda'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Título</span>
          <input
            value={values.descricao}
            onChange={(e) => setValues((v) => ({ ...v, descricao: e.target.value }))}
            required
            autoFocus
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        {item?.recorrenciaId && (
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-tint-blue px-2.5 py-1 text-xs text-accent">
            <Repeat className="h-3 w-3" /> Parte de uma série recorrente
          </span>
        )}

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Data</span>
            <input
              type="date"
              value={values.data}
              onChange={(e) => setValues((v) => ({ ...v, data: e.target.value }))}
              required
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Tipo</span>
            <select
              value={values.tipo}
              onChange={(e) => setValues((v) => ({ ...v, tipo: e.target.value as AgendaItemTipo }))}
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            >
              {(Object.keys(TIPO_LABEL) as AgendaItemTipo[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={values.diaInteiro}
            onChange={(e) => setValues((v) => ({ ...v, diaInteiro: e.target.checked, hora: e.target.checked ? '' : v.hora }))}
          />
          Dia inteiro (sem horário)
        </label>

        {!values.diaInteiro && (
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Início</span>
              <input
                type="time"
                value={values.hora}
                onChange={(e) => setValues((v) => ({ ...v, hora: e.target.value }))}
                className="rounded-control border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Fim</span>
              <input
                type="time"
                value={values.horaFim}
                onChange={(e) => setValues((v) => ({ ...v, horaFim: e.target.value }))}
                className="rounded-control border border-border-strong bg-surface px-3 py-2"
              />
            </label>
          </div>
        )}

        {!item && (
          <div className="flex flex-col gap-2 rounded-container border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={values.repetir}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    repetir: e.target.checked,
                    dataFimRecorrencia: e.target.checked && !v.repetir ? addAnosIso(v.data, 1) : v.dataFimRecorrencia,
                  }))
                }
              />
              <Repeat className="h-3.5 w-3.5" /> Repetir
            </label>

            {values.repetir && (
              <div className="flex flex-col gap-2 pl-6">
                <select
                  value={values.frequencia}
                  onChange={(e) => setValues((v) => ({ ...v, frequencia: e.target.value as AgendaRecorrenciaFrequencia }))}
                  className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
                >
                  {(Object.keys(FREQUENCIA_LABEL) as AgendaRecorrenciaFrequencia[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCIA_LABEL[f]}
                    </option>
                  ))}
                </select>

                {values.frequencia !== 'PERSONALIZADA' && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span>A cada</span>
                    <input
                      type="number"
                      min={1}
                      value={values.intervalo}
                      onChange={(e) => setValues((v) => ({ ...v, intervalo: Math.max(1, Number(e.target.value)) }))}
                      className="w-16 rounded-control border border-border-strong bg-surface px-2 py-1.5"
                    />
                    <span>{UNIDADE_INTERVALO[values.frequencia]}</span>
                  </div>
                )}

                {values.frequencia === 'SEMANAL' && (
                  <div className="flex flex-wrap gap-1.5">
                    {DIA_SEMANA_CODES.map((d) => {
                      const ativo = values.diasDaSemana.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setValues((v) => ({
                              ...v,
                              diasDaSemana: ativo ? v.diasDaSemana.filter((x) => x !== d) : [...v.diasDaSemana, d],
                            }))
                          }
                          className={cn(
                            'rounded-control border px-2.5 py-1 text-xs',
                            ativo ? 'border-accent bg-tint-blue text-accent' : 'border-border-strong bg-surface text-text-secondary',
                          )}
                        >
                          {DIA_SEMANA_LABEL[d]}
                        </button>
                      );
                    })}
                  </div>
                )}

                {values.frequencia === 'PERSONALIZADA' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>Toda</span>
                      <select
                        value={values.posicaoNoMes}
                        onChange={(e) => setValues((v) => ({ ...v, posicaoNoMes: Number(e.target.value) }))}
                        className="rounded-control border border-border-strong bg-surface px-2 py-1.5"
                      >
                        {[1, 2, 3, 4, -1].map((p) => (
                          <option key={p} value={p}>
                            {POSICAO_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={values.diasDaSemana[0] ?? 'SEX'}
                        onChange={(e) => setValues((v) => ({ ...v, diasDaSemana: [e.target.value] }))}
                        className="rounded-control border border-border-strong bg-surface px-2 py-1.5"
                      >
                        {DIA_SEMANA_CODES.map((d) => (
                          <option key={d} value={d}>
                            {DIA_SEMANA_LABEL_LONGO[d]}
                          </option>
                        ))}
                      </select>
                      <span>do mês</span>
                    </div>
                  </div>
                )}

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Repetir até</span>
                  <input
                    type="date"
                    value={values.dataFimRecorrencia}
                    onChange={(e) => setValues((v) => ({ ...v, dataFimRecorrencia: e.target.value }))}
                    max={addAnosIso(values.data, 2)}
                    required
                    className="w-44 rounded-control border border-border-strong bg-surface px-3 py-2"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-container border border-border p-3">
          <span className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Bell className="h-3.5 w-3.5" /> Lembrete
          </span>
          <div className="flex flex-wrap gap-1.5">
            {LEMBRETE_ANTECEDENCIAS.map((dias) => {
              const ativo = values.lembretes.includes(dias);
              return (
                <button
                  key={dias}
                  type="button"
                  onClick={() =>
                    setValues((v) => ({
                      ...v,
                      lembretes: ativo ? v.lembretes.filter((x) => x !== dias) : [...v.lembretes, dias],
                    }))
                  }
                  className={cn(
                    'rounded-control border px-2.5 py-1 text-xs',
                    ativo ? 'border-accent bg-tint-blue text-accent' : 'border-border-strong bg-surface text-text-secondary',
                  )}
                >
                  {LEMBRETE_ANTECEDENCIA_LABEL[dias]}
                </button>
              );
            })}
          </div>
          {values.lembretes.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={values.lembreteEmail}
                onChange={(e) => setValues((v) => ({ ...v, lembreteEmail: e.target.checked }))}
              />
              Também por e-mail
            </label>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-text-secondary">Categoria</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setValues((v) => ({ ...v, categoriaId: '' }))}
              className={cn(
                'rounded-control border px-3 py-1.5 text-xs',
                values.categoriaId === '' ? 'border-accent bg-tint-blue text-accent' : 'border-border-strong bg-surface text-text-secondary',
              )}
            >
              Sem categoria
            </button>
            {categorias.map((c) => {
              const cor = categoriaCor(c, isDark);
              const selected = values.categoriaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, categoriaId: c.id }))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition',
                    selected ? 'border-accent bg-tint-blue text-text' : 'border-border-strong bg-surface text-text-secondary',
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                  {c.nome}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Responsável</span>
          <select
            value={values.responsavelId}
            onChange={(e) => setValues((v) => ({ ...v, responsavelId: e.target.value }))}
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          >
            <option value="">Ninguém (só eu)</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        {projetos.length > 0 && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Projeto</span>
            <select
              value={values.projetoId}
              onChange={(e) => setValues((v) => ({ ...v, projetoId: e.target.value }))}
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            >
              <option value="">Nenhum</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Prioridade</span>
          <select
            value={values.prioridade}
            onChange={(e) => setValues((v) => ({ ...v, prioridade: e.target.value as AgendaItemPrioridade | '' }))}
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          >
            <option value="">Sem prioridade</option>
            {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABEL[p]}
              </option>
            ))}
          </select>
        </label>

        {tarefasDoProjeto && tarefasDoProjeto.length > 0 && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Bloqueada por</span>
            <select
              value={values.bloqueadoPorId}
              onChange={(e) => setValues((v) => ({ ...v, bloqueadoPorId: e.target.value }))}
              className="rounded-control border border-border-strong bg-surface px-3 py-2"
            >
              <option value="">Nenhuma</option>
              {tarefasDoProjeto
                .filter((t) => t.id !== item?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.descricao}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Descrição / anotações</span>
          <textarea
            value={values.notas}
            onChange={(e) => setValues((v) => ({ ...v, notas: e.target.value }))}
            rows={3}
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        {item && <SubtarefasSection agendaItemId={item.id} />}

        {item && <CommentsSection agendaItemId={item.id} />}

        {item && <AuditSection agendaItemId={item.id} />}

        <div className="mt-2 flex items-center justify-between">
          {onDelete ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-sm text-danger hover:underline">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
              {item?.recorrenciaId && onDeleteSeries && (
                <button type="button" onClick={onDeleteSeries} className="flex items-center gap-1.5 text-sm text-danger hover:underline">
                  <Repeat className="h-4 w-4" /> Excluir toda a série
                </button>
              )}
            </div>
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

function SubtarefasSection({ agendaItemId }: { agendaItemId: string }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');

  const { data: subtarefas } = useQuery({
    queryKey: ['agenda', 'subtarefas', agendaItemId],
    queryFn: async () => (await api.get<Subtarefa[]>(`/agenda/items/${agendaItemId}/subtarefas`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agenda', 'subtarefas', agendaItemId] });

  const criar = useMutation({
    mutationFn: async () => api.post(`/agenda/items/${agendaItemId}/subtarefas`, { titulo }),
    onSuccess: () => {
      setTitulo('');
      invalidate();
    },
  });
  const alternar = useMutation({
    mutationFn: async (vars: { id: string; concluida: boolean }) => api.patch(`/agenda/items/${agendaItemId}/subtarefas/${vars.id}`, { concluida: vars.concluida }),
    onSuccess: invalidate,
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/agenda/items/${agendaItemId}/subtarefas/${id}`),
    onSuccess: invalidate,
  });

  const total = subtarefas?.length ?? 0;
  const concluidas = subtarefas?.filter((s) => s.concluida).length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm text-text-secondary">
        <ListChecks className="h-3.5 w-3.5" /> Subtarefas {total > 0 && `(${concluidas}/${total})`}
      </span>
      <div className="flex flex-col gap-1">
        {subtarefas?.map((s) => (
          <div key={s.id} className="group flex items-center gap-2 rounded-control px-1.5 py-1 hover:bg-surface-alt">
            <input type="checkbox" checked={s.concluida} onChange={(e) => alternar.mutate({ id: s.id, concluida: e.target.checked })} />
            <span className={cn('flex-1 text-sm', s.concluida && 'text-text-tertiary line-through')}>{s.titulo}</span>
            <button
              type="button"
              onClick={() => excluir.mutate(s.id)}
              className="text-text-tertiary opacity-0 hover:text-danger group-hover:opacity-100"
              aria-label="Excluir subtarefa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Adicionar subtarefa…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && titulo.trim()) {
              e.preventDefault();
              criar.mutate();
            }
          }}
          className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="add"
          disabled={!titulo.trim() || criar.isPending}
          onClick={() => criar.mutate()}
          className="flex items-center justify-center"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CommentsSection({ agendaItemId }: { agendaItemId: string }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');

  const { data: comentarios } = useQuery({
    queryKey: ['agenda', 'comentarios', agendaItemId],
    queryFn: async () => (await api.get<Comentario[]>(`/agenda/items/${agendaItemId}/comentarios`)).data,
  });

  const criar = useMutation({
    mutationFn: async () => api.post(`/agenda/items/${agendaItemId}/comentarios`, { texto }),
    onSuccess: () => {
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['agenda', 'comentarios', agendaItemId] });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-text-secondary">Comentários</span>
      <div className="scroll-suave flex max-h-48 flex-col gap-2 overflow-y-auto">
        {comentarios?.map((c) => (
          <div key={c.id} className="rounded-container bg-surface-alt p-2.5 text-sm">
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-text">
              <UserRound className="h-3 w-3 text-text-tertiary" />
              {c.autor}
              <span className="font-normal text-text-tertiary">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-text">{c.texto}</p>
          </div>
        ))}
        {comentarios?.length === 0 && <p className="text-xs text-text-tertiary">Nenhum comentário ainda.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Adicionar comentário…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && texto.trim()) {
              e.preventDefault();
              criar.mutate();
            }
          }}
          className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button
          type="button"
          disabled={!texto.trim() || criar.isPending}
          onClick={() => criar.mutate()}
          className="flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  criado: 'Criado',
  editado: 'Editado',
  concluido: 'Marcado como concluído',
  reaberto: 'Reaberto',
  atribuido: 'Responsável alterado',
  excluido: 'Excluído',
  restaurado: 'Restaurado',
  comentario_adicionado: 'Comentário adicionado',
  subtarefa_criada: 'Subtarefa adicionada',
  subtarefa_atualizada: 'Subtarefa atualizada',
  subtarefa_excluida: 'Subtarefa removida',
  participantes_atualizados: 'Participantes atualizados',
  marco_criado: 'Marco adicionado',
  marco_atualizado: 'Marco atualizado',
  marco_excluido: 'Marco removido',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action.replace(/_/g, ' ');
}

export function AuditSection({ agendaItemId }: { agendaItemId: string }) {
  const [open, setOpen] = useState(false);
  const { data: eventos } = useQuery({
    queryKey: ['agenda', 'auditoria', agendaItemId],
    queryFn: async () => (await api.get<AuditEvento[]>(`/agenda/items/${agendaItemId}/auditoria`)).data,
  });

  if (!eventos || eventos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
        Trilha de auditoria
        <span className="text-xs text-text-tertiary">({eventos.length})</span>
      </button>
      {open && (
        <ul className="scroll-suave flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-text-tertiary">
          {eventos.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString('pt-BR')} — {auditActionLabel(e.action)} — {e.actorName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
