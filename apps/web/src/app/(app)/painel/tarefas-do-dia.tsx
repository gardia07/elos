'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, ExternalLink, Pin, Plus, UserPlus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { parseIsoUtc } from '../agenda/lib';
import type { Usuario } from '../agenda/types';

type TarefaOrigem = 'TASK' | 'AGENDA' | 'APROVACAO';
type TarefaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

interface TarefaDoDiaItem {
  id: string;
  origem: TarefaOrigem;
  origemId: string;
  titulo: string;
  hub: string;
  prazo: string | null;
  prioridade: TarefaPrioridade;
  fixada: boolean;
  href: string | null;
  delegadoPara: { userId: string; nome: string } | null;
  podeConcluir: boolean;
  podeAdiar: boolean;
  podeDelegar: boolean;
}

interface TarefasDoDiaResponse {
  itens: TarefaDoDiaItem[];
  concluidasHoje: number;
  totalHoje: number;
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

export function TarefasDoDia() {
  const queryClient = useQueryClient();
  const [novoTitulo, setNovoTitulo] = useState('');
  const [popoverAberto, setPopoverAberto] = useState<{ id: string; tipo: 'adiar' | 'delegar' } | null>(null);

  const { data } = useQuery({
    queryKey: ['tarefas-do-dia'],
    queryFn: async () => (await api.get<TarefasDoDiaResponse>('/tarefas-do-dia')).data,
  });

  const { data: usuarios } = useQuery({
    queryKey: ['agenda', 'usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/agenda/usuarios')).data,
    enabled: popoverAberto?.tipo === 'delegar',
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['tarefas-do-dia'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'agenda' });
  };

  const concluir = useMutation({
    mutationFn: async (item: TarefaDoDiaItem) => api.patch(`/tarefas-do-dia/${item.origem}/${item.origemId}/concluir`),
    onSuccess: invalidar,
  });

  const adiar = useMutation({
    mutationFn: async (vars: { item: TarefaDoDiaItem; dias: number }) =>
      api.patch(`/tarefas-do-dia/${vars.item.origem}/${vars.item.origemId}/adiar`, { dias: vars.dias }),
    onSuccess: () => {
      invalidar();
      setPopoverAberto(null);
    },
  });

  const delegar = useMutation({
    mutationFn: async (vars: { item: TarefaDoDiaItem; userId: string }) =>
      api.patch(`/tarefas-do-dia/${vars.item.origem}/${vars.item.origemId}/delegar`, { userId: vars.userId }),
    onSuccess: () => {
      invalidar();
      setPopoverAberto(null);
    },
  });

  const alternarFixacao = useMutation({
    mutationFn: async (item: TarefaDoDiaItem) =>
      item.fixada
        ? api.delete(`/tarefas-do-dia/${item.origem}/${item.origemId}/fixar`)
        : api.post(`/tarefas-do-dia/${item.origem}/${item.origemId}/fixar`),
    onSuccess: invalidar,
  });

  const criarManual = useMutation({
    mutationFn: async (titulo: string) => api.post('/tarefas-do-dia/manual', { titulo }),
    onSuccess: () => {
      invalidar();
      setNovoTitulo('');
    },
  });

  const itens = data?.itens ?? [];

  return (
    <Card className="flex h-full max-h-[420px] flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-semibold">Tarefas do dia</h3>
        <span className="text-xs text-text-tertiary">
          {data?.concluidasHoje ?? 0} de {data?.totalHoje ?? 0} concluídas hoje
        </span>
      </div>

      <ul className="scroll-suave flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {itens.map((item) => (
          <li key={item.id} className="rounded-container border border-border p-2.5">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => alternarFixacao.mutate(item)}
                title={item.fixada ? 'Desafixar' : 'Fixar no topo'}
                className={cn('mt-0.5 shrink-0 rounded p-0.5 transition hover:text-accent', item.fixada ? 'text-accent' : 'text-text-tertiary')}
              >
                <Pin className="h-3.5 w-3.5" fill={item.fixada ? 'currentColor' : 'none'} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={PRIORIDADE_TONE[item.prioridade]}>{item.hub}</Badge>
                  {item.prazo && <span className="text-xs text-text-tertiary">{formatPrazo(item.prazo)}</span>}
                  {item.delegadoPara && <span className="text-xs text-text-tertiary">→ {item.delegadoPara.nome}</span>}
                </div>
                <p className="text-sm text-text">{item.titulo}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {item.podeConcluir && (
                  <button
                    type="button"
                    onClick={() => concluir.mutate(item)}
                    title="Concluir"
                    className="rounded p-1 text-text-tertiary transition hover:bg-success-bg hover:text-success"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                {item.podeAdiar && (
                  <button
                    type="button"
                    onClick={() => setPopoverAberto((p) => (p?.id === item.id && p.tipo === 'adiar' ? null : { id: item.id, tipo: 'adiar' }))}
                    title="Adiar"
                    className="rounded p-1 text-text-tertiary transition hover:bg-tint-blue hover:text-accent"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                )}
                {item.podeDelegar && (
                  <button
                    type="button"
                    onClick={() => setPopoverAberto((p) => (p?.id === item.id && p.tipo === 'delegar' ? null : { id: item.id, tipo: 'delegar' }))}
                    title="Delegar"
                    className="rounded p-1 text-text-tertiary transition hover:bg-tint-blue hover:text-accent"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                )}
                {item.href && (
                  <Link href={item.href} title="Abrir origem" className="rounded p-1 text-text-tertiary transition hover:bg-surface-alt hover:text-accent">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {popoverAberto?.id === item.id && popoverAberto.tipo === 'adiar' && (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-divider pt-2 pl-6">
                {ADIAR_OPCOES.map((op) => (
                  <button
                    key={op.dias}
                    type="button"
                    onClick={() => adiar.mutate({ item, dias: op.dias })}
                    disabled={adiar.isPending}
                    className="rounded-control border border-border-strong px-2.5 py-1 text-xs text-text-secondary transition hover:border-accent hover:text-accent"
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            )}

            {popoverAberto?.id === item.id && popoverAberto.tipo === 'delegar' && (
              <div className="scroll-suave mt-2 flex max-h-40 flex-col gap-0.5 overflow-y-auto border-t border-divider pt-2 pl-6">
                {(usuarios ?? []).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => delegar.mutate({ item, userId: u.id })}
                    disabled={delegar.isPending}
                    className="rounded-control px-2 py-1 text-left text-xs text-text-secondary transition hover:bg-surface-alt hover:text-text"
                  >
                    {u.name}
                  </button>
                ))}
                {usuarios?.length === 0 && <span className="px-2 py-1 text-xs text-text-tertiary">Nenhum usuário disponível.</span>}
              </div>
            )}
          </li>
        ))}
        {itens.length === 0 && <p className="text-sm text-text-tertiary">Nada pendente por aqui.</p>}
      </ul>

      <form
        className="mt-3 flex shrink-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (novoTitulo.trim()) criarManual.mutate(novoTitulo.trim());
        }}
      >
        <input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="Adicionar tarefa…"
          className="flex-1 rounded-control border border-border-strong bg-surface px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={criarManual.isPending || !novoTitulo.trim()}
          className="flex items-center justify-center rounded-control bg-accent px-3 py-1.5 text-on-accent transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
    </Card>
  );
}
