'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { complianceTone } from '@/lib/format';
import { Badge, Button, Card, KpiCard } from '@/components/ui';
import { Header } from '@/components/header';

interface Kpis {
  colaboradoresAtivos: number;
  colaboradoresAtivosDeltaPct: number | null;
  pendenciasAbertas: number;
  pendenciasAbertasDelta: number | null;
  complianceGeral: number;
  complianceGeralDelta: number | null;
  conformidadeDocumental: number;
  conformidadeDocumentalDelta: number | null;
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

interface AgendaItem {
  id: string;
  hora: string | null;
  descricao: string;
  concluida: boolean;
  origem: string;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayIso();
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [novaHora, setNovaHora] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

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

  const { data: agendaItems } = useQuery({
    queryKey: ['agenda', 'items', today],
    queryFn: async () => (await api.get<AgendaItem[]>('/agenda/items', { params: { data: today } })).data,
  });

  const { data: notepad } = useQuery({
    queryKey: ['agenda', 'notepad', today],
    queryFn: async () => (await api.get<{ conteudo: string }>(`/agenda/notepad/${today}`)).data,
  });

  const invalidateAgenda = () => queryClient.invalidateQueries({ queryKey: ['agenda', 'items', today] });

  const createItem = useMutation({
    mutationFn: async () => api.post('/agenda/items', { data: today, hora: novaHora || undefined, descricao: novaDescricao }),
    onSuccess: () => {
      invalidateAgenda();
      setNovaHora('');
      setNovaDescricao('');
    },
  });

  const toggleItem = useMutation({
    mutationFn: async (vars: { id: string; concluida: boolean }) => api.patch(`/agenda/items/${vars.id}`, { concluida: vars.concluida }),
    onSuccess: invalidateAgenda,
  });

  const saveNotepad = useMutation({
    mutationFn: async () => api.put(`/agenda/notepad/${today}`, { conteudo: noteContent ?? '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda', 'notepad', today] }),
  });

  const content = noteContent ?? notepad?.conteudo ?? '';

  const sendToElo = () => {
    if (!content.trim()) return;
    router.push(`/elo?pergunta=${encodeURIComponent(content)}&modoAgente=1`);
  };

  // Agenda do dia é automática: junta o que foi digitado manualmente ou criado
  // pela Elô (AgendaItem) com as pendências abertas do sistema (Task), num só lugar.
  const timedItems = (agendaItems ?? [])
    .slice()
    .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'));
  const taskItems = (tasks ?? []).slice().sort((a, b) => PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade]);

  const concluidas = timedItems.filter((i) => i.concluida).length;
  const total = timedItems.length + taskItems.length;

  return (
    <>
      <Header eyebrow="Seu dia a dia" title="Área de trabalho" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-5 gap-4">
            <KpiCard
              label="Conformidade documental"
              value={<Badge tone={complianceTone(kpis?.conformidadeDocumental ?? 0)}>{kpis?.conformidadeDocumental ?? '—'}%</Badge>}
              delta={<Delta value={kpis?.conformidadeDocumentalDelta ?? null} unidade=" pts" favoravel="alto" />}
            />
            <KpiCard
              label="Compliance (ética e políticas)"
              value={kpis?.complianceGeral ?? '—'}
              delta={<Delta value={kpis?.complianceGeralDelta ?? null} unidade=" pts" favoravel="alto" />}
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

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Agenda do dia</h3>
              <span className="text-xs text-text-tertiary">
                {concluidas} de {total} concluídas
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {timedItems.map((item) => (
                <li key={`agenda-${item.id}`} className="flex items-start gap-3 rounded-[10px] border border-border p-2.5">
                  <input
                    type="checkbox"
                    checked={item.concluida}
                    onChange={(e) => toggleItem.mutate({ id: item.id, concluida: e.target.checked })}
                    className="mt-0.5"
                  />
                  <div>
                    {item.hora && <div className="text-xs font-medium text-text-tertiary">{item.hora}</div>}
                    <div className={`text-sm ${item.concluida ? 'text-text-tertiary line-through' : 'text-text'}`}>{item.descricao}</div>
                  </div>
                </li>
              ))}
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
              <Button type="submit" disabled={createItem.isPending}>
                Adicionar
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Bloco de notas</h3>
              <p className="text-xs text-text-tertiary">Rascunho rápido do dia — para virar tarefa ou item de agenda, envie para a Elô.</p>
            </div>

            <textarea
              value={content}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={8}
              placeholder="Anote aqui qualquer demanda que surgir durante o dia…"
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm leading-relaxed"
            />

            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" disabled={saveNotepad.isPending} onClick={() => saveNotepad.mutate()}>
                Salvar
              </Button>
              <Button disabled={!content.trim()} onClick={sendToElo}>
                Enviar para Elô →
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
