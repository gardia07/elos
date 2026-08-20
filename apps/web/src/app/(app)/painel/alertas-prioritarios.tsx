'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, Clock, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { parseIsoUtc } from '../agenda/lib';

type TarefaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

interface AlertaTask {
  id: string;
  modulo: string;
  titulo: string;
  prioridade: TarefaPrioridade;
  origem: string;
  prazo: string | null;
  detalhes: { href?: string; score?: number; impacto?: number; probabilidade?: number } | null;
}

interface TarefaDoDiaResponse {
  itens: { origem: string; origemId: string; fixada: boolean }[];
}

const PRIORIDADE_TONE: Record<TarefaPrioridade, 'grey' | 'blue' | 'amber' | 'red'> = {
  BAIXA: 'grey',
  MEDIA: 'blue',
  ALTA: 'amber',
  CRITICA: 'red',
};

const ADIAR_OPCOES: { label: string; dias: 1 | 3 | 7 }[] = [
  { label: 'Amanhã', dias: 1 },
  { label: '+3 dias', dias: 3 },
  { label: 'Próxima semana', dias: 7 },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatPrazo(prazoIso: string): string {
  const hojeIso = todayIso();
  const prazoDiaIso = prazoIso.slice(0, 10);
  if (prazoDiaIso === hojeIso) return 'Hoje';
  const dias = Math.round((parseIsoUtc(prazoDiaIso).getTime() - parseIsoUtc(hojeIso).getTime()) / 86_400_000);
  if (dias === 1) return 'Amanhã';
  if (dias < 0) return `Atrasado há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
  return parseIsoUtc(prazoDiaIso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

export function AlertasPrioritarios() {
  const queryClient = useQueryClient();
  const [adiarAberto, setAdiarAberto] = useState<string | null>(null);

  const { data: tasks } = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: async () => (await api.get<AlertaTask[]>('/dashboard/tasks')).data,
  });

  // Mesma query key usada por TarefasDoDia -- reaproveita o cache pra saber
  // quais alertas já estão fixados (promovidos) sem duplicar a chamada.
  const { data: tarefasDoDia } = useQuery({
    queryKey: ['tarefas-do-dia'],
    queryFn: async () => (await api.get<TarefaDoDiaResponse>('/tarefas-do-dia')).data,
  });

  const fixadoSet = new Set((tarefasDoDia?.itens ?? []).filter((i) => i.origem === 'TASK' && i.fixada).map((i) => i.origemId));

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tarefas-do-dia'] });
  };

  const resolver = useMutation({
    mutationFn: async (id: string) => api.patch(`/tarefas-do-dia/TASK/${id}/concluir`),
    onSuccess: invalidar,
  });

  const adiar = useMutation({
    mutationFn: async (vars: { id: string; dias: number }) => api.patch(`/tarefas-do-dia/TASK/${vars.id}/adiar`, { dias: vars.dias }),
    onSuccess: () => {
      invalidar();
      setAdiarAberto(null);
    },
  });

  const resolverHoje = useMutation({
    mutationFn: async (vars: { id: string; fixado: boolean }) =>
      vars.fixado ? api.delete(`/tarefas-do-dia/TASK/${vars.id}/fixar`) : api.post(`/tarefas-do-dia/TASK/${vars.id}/fixar`),
    onSuccess: invalidar,
  });

  const alertas = (tasks ?? []).filter((t) => t.origem === 'SISTEMA');

  return (
    <Card className="flex h-full max-h-[420px] flex-col">
      <h3 className="mb-3 shrink-0 text-sm font-semibold">Alertas prioritários</h3>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {alertas.map((t) => {
          const href = t.detalhes?.href;
          const score = t.detalhes?.score;
          const fixado = fixadoSet.has(t.id);
          return (
            <li key={t.id} className="rounded-container border border-border p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={PRIORIDADE_TONE[t.prioridade]}>{t.modulo}</Badge>
                    {t.prazo && <span className="text-xs text-text-tertiary">{formatPrazo(t.prazo)}</span>}
                    {score != null && (
                      <span className="text-xs text-text-tertiary" title={`Impacto ${t.detalhes?.impacto} × Probabilidade ${t.detalhes?.probabilidade}`}>
                        score {score}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text">{t.titulo}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => resolver.mutate(t.id)}
                    title="Resolver"
                    className="rounded p-1 text-text-tertiary transition hover:bg-success-bg hover:text-success"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resolverHoje.mutate({ id: t.id, fixado })}
                    title={fixado ? 'Remover de Tarefas do dia' : 'Resolver hoje (leva pra Tarefas do dia)'}
                    className={cn('rounded p-1 transition hover:bg-tint-blue hover:text-accent', fixado ? 'bg-tint-blue text-accent' : 'text-text-tertiary')}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdiarAberto((id) => (id === t.id ? null : t.id))}
                    title="Adiar"
                    className="rounded p-1 text-text-tertiary transition hover:bg-tint-blue hover:text-accent"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                  {href && (
                    <Link href={href} title="Abrir origem" className="rounded p-1 text-text-tertiary transition hover:bg-surface-alt hover:text-accent">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {adiarAberto === t.id && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-divider pt-2 pl-1">
                  {ADIAR_OPCOES.map((op) => (
                    <button
                      key={op.dias}
                      type="button"
                      onClick={() => adiar.mutate({ id: t.id, dias: op.dias })}
                      disabled={adiar.isPending}
                      className="rounded-control border border-border-strong px-2.5 py-1 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {alertas.length === 0 && <p className="text-xs text-text-tertiary">Nenhum alerta prioritário no momento.</p>}
      </ul>
    </Card>
  );
}
