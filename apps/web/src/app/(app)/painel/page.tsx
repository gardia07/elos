'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { complianceTone } from '@/lib/format';
import { Badge, Button, Card, KpiCard } from '@/components/ui';
import { Header } from '@/components/header';
import { PriorityAlert, PriorityAlerts } from '@/components/priority-alerts';
import { categoriaCor, useIsDarkTheme } from '../agenda/lib';
import type { Categoria } from '../agenda/types';
import { HUB_FALLBACK_COLOR } from '../agenda/types';

interface Kpis {
  colaboradoresAtivos: number;
  colaboradoresAtivosDeltaPct: number | null;
  pendenciasAbertas: number;
  pendenciasAbertasDelta: number | null;
  conformidadeGeral: number;
  conformidadeGeralDelta: number | null;
  riscoGeral: 'Baixo' | 'Médio' | 'Alto';
  alertasCriticosAtivos: number;
}

interface Task {
  id: string;
  modulo: string;
  titulo: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  origem: string;
  detalhes: { href?: string } | null;
}

const PRIORIDADE_TONE = { BAIXA: 'grey', MEDIA: 'blue', ALTA: 'amber', CRITICA: 'red' } as const;
const PRIORIDADE_PESO = { CRITICA: 3, ALTA: 2, MEDIA: 1, BAIXA: 0 } as const;
const RISCO_TONE = { Baixo: 'green', Médio: 'amber', Alto: 'red' } as const;

type AgendaItemTipo = 'REUNIAO' | 'PRAZO' | 'TAREFA' | 'PESSOAL' | 'LEMBRETE';

interface AgendaItem {
  id: string;
  data: string;
  hora: string | null;
  descricao: string;
  notas: string | null;
  tipo: AgendaItemTipo;
  concluida: boolean;
  origem: string;
}

type EventoOrigem =
  | 'AGENDA_ITEM'
  | 'LABOR_DEADLINE'
  | 'OCCUPATIONAL_EXAM'
  | 'NR_TRAINING'
  | 'VACATION_REQUEST'
  | 'TERMINATION'
  | 'TERMINATION_AVISO_FIM'
  | 'TERMINATION_PAGAMENTO'
  | 'DOCUMENT_REQUIREMENT'
  | 'ANIVERSARIO_COLABORADOR'
  | 'ANIVERSARIO_ADMISSAO';

interface Evento {
  id: string;
  origem: EventoOrigem;
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
  concluida: boolean;
  hora?: string | null;
  tipo?: AgendaItemTipo;
  notas?: string | null;
  categoriaId?: string | null;
}

const AGENDA_TIPO_LABEL: Record<AgendaItemTipo, string> = {
  REUNIAO: 'Evento',
  PRAZO: 'Prazo',
  TAREFA: 'Tarefa',
  PESSOAL: 'Pessoal',
  LEMBRETE: 'Lembrete',
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WeekDay {
  iso: string;
  label: string;
  dayNum: number;
}

function getCurrentWeekDays(): WeekDay[] {
  const now = new Date();
  const dow = now.getDay(); // 0=domingo..6=sábado
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: toIso(d), label, dayNum: d.getDate() };
  });
}

function getWeekLabel(days: WeekDay[]): string {
  const monday = new Date(days[0].iso);
  const mesAno = monday.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesAnoCap = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
  return `${mesAnoCap} · Semana de ${days[0].dayNum} a ${days[4].dayNum}`;
}

function Delta({ value, unidade, favoravel }: { value: number | null; unidade: string; favoravel: 'alto' | 'baixo' }) {
  if (value == null) return <span className="text-text-tertiary">Sem histórico suficiente</span>;
  if (value === 0) return <span className="text-text-tertiary">Estável vs. mês anterior</span>;
  const positivo = value > 0;
  const bom = favoravel === 'alto' ? positivo : !positivo;
  return (
    <span className={bom ? 'text-success' : 'text-danger'}>
      {positivo ? '↑' : '↓'} {positivo ? '+' : ''}
      {value}
      {unidade} vs. mês anterior
    </span>
  );
}

export default function PainelPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const today = todayIso();
  const [novaData, setNovaData] = useState(today);
  const [novaHora, setNovaHora] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoTipo, setNovoTipo] = useState<AgendaItemTipo>('TAREFA');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notasDraft, setNotasDraft] = useState('');

  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const weekLabel = useMemo(() => getWeekLabel(weekDays), [weekDays]);
  const weekStart = weekDays[0].iso;
  const weekEnd = weekDays[4].iso;

  const { data: kpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => (await api.get<Kpis>('/dashboard/kpis')).data,
  });

  const { data: tasks } = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: async () => (await api.get<Task[]>('/dashboard/tasks')).data,
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => api.patch(`/dashboard/tasks/${id}`, { status: 'CONCLUIDA' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] }),
  });

  // Agenda do dia consulta a Agenda Geral (não só /agenda/items) para trazer,
  // além dos itens manuais/da Elô, os prazos calculados a partir de outros
  // registros do sistema (ex.: fim do aviso prévio e prazo de pagamento de um
  // desligamento em andamento) — sem isso esses prazos só apareciam na página
  // separada de Agenda Geral, nunca no widget do dia a dia.
  const { data: eventosHoje } = useQuery({
    queryKey: ['ferramentas', 'agenda-geral', today],
    queryFn: async () => (await api.get<Evento[]>('/ferramentas/agenda-geral', { params: { data: today } })).data,
  });

  const { data: weekItems } = useQuery({
    queryKey: ['agenda', 'items', 'semana', weekStart, weekEnd],
    queryFn: async () => (await api.get<AgendaItem[]>('/agenda/items', { params: { dataInicio: weekStart, dataFim: weekEnd } })).data,
  });

  const { data: categorias } = useQuery({
    queryKey: ['agenda', 'categorias'],
    queryFn: async () => (await api.get<Categoria[]>('/agenda/categorias')).data,
  });
  const isDark = useIsDarkTheme();
  const corDoItem = (item: Pick<Evento, 'categoriaId' | 'hub'>) =>
    item.categoriaId
      ? categoriaCor(categorias?.find((c) => c.id === item.categoriaId), isDark)
      : HUB_FALLBACK_COLOR[item.hub] ?? '#a89c8d';

  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of weekItems ?? []) {
      const iso = item.data.slice(0, 10);
      map[iso] = (map[iso] ?? 0) + 1;
    }
    return map;
  }, [weekItems]);

  const invalidateAgenda = () => {
    queryClient.invalidateQueries({ queryKey: ['ferramentas', 'agenda-geral', today] });
    queryClient.invalidateQueries({ queryKey: ['agenda', 'items', 'semana', weekStart, weekEnd] });
  };

  const createItem = useMutation({
    mutationFn: async () => api.post('/agenda/items', { data: novaData, hora: novaHora || undefined, descricao: novaDescricao, tipo: novoTipo }),
    onSuccess: () => {
      invalidateAgenda();
      setNovaData(today);
      setNovaHora('');
      setNovaDescricao('');
      setNovoTipo('TAREFA');
    },
  });

  const toggleItem = useMutation({
    mutationFn: async (vars: { id: string; concluida: boolean }) => api.patch(`/agenda/items/${vars.id}`, { concluida: vars.concluida }),
    onSuccess: invalidateAgenda,
  });

  const concluirEvento = useMutation({
    mutationFn: async (vars: { origem: EventoOrigem; id: string }) => api.post('/ferramentas/agenda-geral/concluir', vars),
    onSuccess: invalidateAgenda,
  });

  const saveNotas = useMutation({
    mutationFn: async (vars: { id: string; notas: string }) => api.patch(`/agenda/items/${vars.id}`, { notas: vars.notas }),
    onSuccess: invalidateAgenda,
  });

  // Agenda do dia mostra o que foi digitado manualmente/pela Elô (AgendaItem)
  // e as tarefas manuais (Task origem=MANUAL), além dos prazos calculados
  // pela Agenda Geral (ex.: desligamento, férias, exames, treinamentos).
  const timedItems = (eventosHoje ?? [])
    .slice()
    .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'));
  const taskItems = (tasks ?? [])
    .filter((t) => t.origem === 'MANUAL')
    .sort((a, b) => PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade]);

  const PRIORIDADE_SEVERIDADE = { CRITICA: 'alta', ALTA: 'alta', MEDIA: 'media', BAIXA: 'baixa' } as const;
  const alertasPrioritarios: PriorityAlert[] = (tasks ?? [])
    .filter((t) => t.origem === 'SISTEMA')
    .sort((a, b) => PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade])
    .map((t) => ({ id: t.id, categoria: t.modulo, mensagem: t.titulo, severidade: PRIORIDADE_SEVERIDADE[t.prioridade], href: t.detalhes?.href }));

  const concluidas = timedItems.filter((i) => i.concluida).length;
  const total = timedItems.length + taskItems.length;

  return (
    <>
      <Header eyebrow="Seu dia a dia" title="Área de trabalho" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Conformidade geral"
              value={<Badge tone={complianceTone(kpis?.conformidadeGeral ?? 0)}>{kpis?.conformidadeGeral ?? '—'}%</Badge>}
              delta={<Delta value={kpis?.conformidadeGeralDelta ?? null} unidade=" pts" favoravel="alto" />}
            />
            <KpiCard
              label="Pendências em aberto"
              value={kpis?.pendenciasAbertas ?? '—'}
              delta={<Delta value={kpis?.pendenciasAbertasDelta ?? null} unidade="" favoravel="baixo" />}
            />
            <KpiCard
              label="Colaboradores ativos"
              value={kpis?.colaboradoresAtivos.toLocaleString('pt-BR') ?? '—'}
              delta={<Delta value={kpis?.colaboradoresAtivosDeltaPct ?? null} unidade="%" favoravel="alto" />}
            />
            <KpiCard
              label="Risco geral"
              value={kpis && <Badge tone={RISCO_TONE[kpis.riscoGeral]}>{kpis.riscoGeral}</Badge>}
              delta={<span className="text-text-tertiary">{kpis?.alertasCriticosAtivos ?? 0} alerta(s) crítico(s) ativo(s)</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <PriorityAlerts alertas={alertasPrioritarios} onResolver={(id) => completeTask.mutate(id)} />
            </div>

            <Card className="lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Agenda do dia</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">
                    {concluidas} de {total} concluídas
                  </span>
                  <Link href="/agenda?view=semana" className="text-xs text-accent hover:underline">
                    Ver semana completa →
                  </Link>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">{weekLabel}</div>
                <div className="grid grid-cols-5 gap-2">
                  {weekDays.map((d) => {
                    const isToday = d.iso === today;
                    const count = countsByDay[d.iso] ?? 0;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => router.push(`/agenda?view=dia&data=${d.iso}`)}
                        className={`flex flex-col items-center gap-1 rounded-[10px] border p-2 text-center transition ${
                          isToday ? 'border-accent bg-tint-blue' : 'border-border hover:border-accent'
                        }`}
                      >
                        <span className="text-[10px] font-medium uppercase text-text-tertiary">{d.label}</span>
                        <span className="text-sm font-semibold text-text">{d.dayNum}</span>
                        {count > 0 && <Badge tone="blue">{count}</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                {timedItems.map((item) => {
                  const isAgendaItem = item.origem === 'AGENDA_ITEM';
                  const isExpanded = isAgendaItem && expandedId === item.id;
                  return (
                    <li key={`agenda-${item.id}`} className="rounded-[10px] border border-border p-2.5">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.concluida}
                          disabled={!isAgendaItem && item.concluida}
                          onChange={(e) =>
                            isAgendaItem
                              ? toggleItem.mutate({ id: item.id, concluida: e.target.checked })
                              : concluirEvento.mutate({ origem: item.origem, id: item.id })
                          }
                          className="mt-0.5"
                        />
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: corDoItem(item) }}
                          title={item.tipo ? AGENDA_TIPO_LABEL[item.tipo] : item.hub}
                        />
                        <button
                          type="button"
                          className="flex-1 text-left"
                          disabled={!isAgendaItem}
                          onClick={() => {
                            if (!isAgendaItem) return;
                            if (isExpanded) {
                              setExpandedId(null);
                            } else {
                              setExpandedId(item.id);
                              setNotasDraft(item.notas ?? '');
                            }
                          }}
                        >
                          {item.hora && <div className="text-xs font-medium text-text-tertiary">{item.hora}</div>}
                          <div className={`text-sm ${item.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}>{item.titulo}</div>
                        </button>
                        {!isAgendaItem && <span className="text-xs text-text-tertiary">{item.hub}</span>}
                        {isAgendaItem && <span className="mt-0.5 text-text-tertiary">{isExpanded ? '▾' : '▸'}</span>}
                      </div>
                      {isExpanded && (
                        <div className="mt-2 flex flex-col gap-2 border-t border-divider pt-2 pl-6">
                          <textarea
                            value={notasDraft}
                            onChange={(e) => setNotasDraft(e.target.value)}
                            placeholder="Anotações, instruções ou etapas…"
                            rows={3}
                            className="rounded-[10px] border border-border-strong bg-surface px-2.5 py-2 text-sm"
                          />
                          <div className="flex items-center gap-3">
                            <Button
                              variant="secondary"
                              onClick={() => saveNotas.mutate({ id: item.id, notas: notasDraft })}
                              disabled={saveNotas.isPending}
                            >
                              {saveNotas.isPending ? 'Salvando…' : 'Salvar nota'}
                            </Button>
                            <Link href={`/agenda?view=dia&data=${today}`} className="text-xs text-accent hover:underline">
                              Abrir na Agenda →
                            </Link>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                {taskItems.map((t) => {
                  const href = t.detalhes?.href;
                  const row = (
                    <>
                      <input
                        type="checkbox"
                        checked={false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          completeTask.mutate(t.id);
                        }}
                        className="mt-0.5"
                      />
                      <Badge tone={PRIORIDADE_TONE[t.prioridade]}>{t.modulo}</Badge>
                      <span className="flex-1 text-sm">{t.titulo}</span>
                    </>
                  );
                  return (
                    <li key={`task-${t.id}`}>
                      {href ? (
                        <Link href={href} className="flex items-start gap-3 rounded-[10px] border border-border p-2.5 hover:border-accent">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3 rounded-[10px] border border-border p-2.5">{row}</div>
                      )}
                    </li>
                  );
                })}
                {total === 0 && <p className="text-sm text-text-tertiary">Nada pendente para hoje.</p>}
              </ul>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createItem.mutate();
                }}
              >
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-36 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm"
                />
                <input
                  type="time"
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                  className="w-24 rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm"
                />
                <input
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Novo item da agenda…"
                  required
                  className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-1.5 text-sm"
                />
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as AgendaItemTipo)}
                  className="rounded-[10px] border border-border-strong bg-surface px-2 py-1.5 text-sm"
                >
                  {(Object.keys(AGENDA_TIPO_LABEL) as AgendaItemTipo[]).map((t) => (
                    <option key={t} value={t}>{AGENDA_TIPO_LABEL[t]}</option>
                  ))}
                </select>
                <Button type="submit" disabled={createItem.isPending}>
                  Adicionar
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
