'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { Header } from '@/components/header';
import { cn } from '@/lib/cn';
import type { Projeto, Usuario } from '../types';
import { PROJETO_STATUS_LABEL, PROJETO_STATUS_TONE } from '../types';
import { parseIsoUtc } from '../lib';
import { ProjetoDrawer, type ProjetoFormValues } from './components';

function formatDataCurta(iso: string): string {
  return parseIsoUtc(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export default function ProjetosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [drawer, setDrawer] = useState<{ open: boolean; projeto: Projeto | null }>({ open: false, projeto: null });

  const { data: projetos } = useQuery({
    queryKey: ['agenda', 'projetos'],
    queryFn: async () => (await api.get<Projeto[]>('/agenda/projetos')).data,
  });

  const { data: usuarios } = useQuery({
    queryKey: ['agenda', 'usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/agenda/usuarios')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos'] });

  const createProjeto = useMutation({
    mutationFn: async (values: ProjetoFormValues) =>
      api.post('/agenda/projetos', {
        nome: values.nome,
        descricao: values.descricao || undefined,
        dataInicio: values.dataInicio,
        dataFim: values.dataFim || undefined,
        cor: values.cor,
        participanteIds: values.participanteIds,
      }),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, projeto: null });
    },
  });

  const updateProjeto = useMutation({
    mutationFn: async (vars: { id: string; values: ProjetoFormValues }) =>
      api.patch(`/agenda/projetos/${vars.id}`, {
        nome: vars.values.nome,
        descricao: vars.values.descricao || undefined,
        dataInicio: vars.values.dataInicio,
        dataFim: vars.values.dataFim || undefined,
        status: vars.values.status,
        cor: vars.values.cor,
      }),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, projeto: null });
    },
  });

  const deleteProjeto = useMutation({
    mutationFn: async (id: string) => api.delete(`/agenda/projetos/${id}`),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, projeto: null });
    },
  });

  const setParticipantes = useMutation({
    mutationFn: async (vars: { id: string; participanteIds: string[] }) =>
      api.put(`/agenda/projetos/${vars.id}/participantes`, { participanteIds: vars.participanteIds }),
    onSuccess: invalidate,
  });

  function handleSave(values: ProjetoFormValues) {
    if (drawer.projeto) {
      updateProjeto.mutate({ id: drawer.projeto.id, values });
    } else {
      createProjeto.mutate(values);
    }
  }

  return (
    <>
      <Header eyebrow="Agenda" title="Projetos" />
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/agenda" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> Voltar para a Agenda
          </Link>
          <Button onClick={() => setDrawer({ open: true, projeto: null })} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Novo projeto
          </Button>
        </div>

        {projetos?.length === 0 && (
          <EmptyState>
            Nenhum projeto ainda. Crie um projeto para acompanhar entregas em equipe, com prazo, status e progresso — sozinho ou com outras pessoas de qualquer time.
          </EmptyState>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(projetos ?? []).map((p) => (
            <Card
              key={p.id}
              className="flex cursor-pointer flex-col gap-3 transition hover:border-accent"
              onClick={() => setDrawer({ open: true, projeto: p })}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.cor }} />
                  <h3 className="font-semibold text-text">{p.nome}</h3>
                </div>
                <Badge tone={p.atrasado ? 'red' : PROJETO_STATUS_TONE[p.status]}>{p.atrasado ? 'Atrasado' : PROJETO_STATUS_LABEL[p.status]}</Badge>
              </div>

              {p.descricao && <p className="line-clamp-2 text-sm text-text-secondary">{p.descricao}</p>}

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>Progresso</span>
                  <span>{p.progresso}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full" style={{ width: `${p.progresso}%`, backgroundColor: p.cor }} />
                </div>
                <span className="text-xs text-text-tertiary">
                  {p.tarefasConcluidas}/{p.totalTarefas} tarefas concluídas
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDataCurta(p.dataInicio)}
                  {p.dataFim && ` — ${formatDataCurta(p.dataFim)}`}
                </span>
                <span className={cn('flex items-center gap-1.5', p.participantes.length > 1 && 'font-medium text-text')}>
                  <Users className="h-3.5 w-3.5" />
                  {p.participantes.length}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <ProjetoDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, projeto: null })}
        usuarios={usuarios ?? []}
        currentUserId={user?.id}
        projeto={drawer.projeto}
        onSave={handleSave}
        onDelete={drawer.projeto ? () => deleteProjeto.mutate(drawer.projeto!.id) : undefined}
        onSetParticipantes={(participanteIds) => {
          if (drawer.projeto) setParticipantes.mutate({ id: drawer.projeto.id, participanteIds });
        }}
        saving={createProjeto.isPending || updateProjeto.isPending}
      />
    </>
  );
}
