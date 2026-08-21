'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projetos } = useQuery({
    queryKey: ['agenda', 'projetos'],
    queryFn: async () => (await api.get<Projeto[]>('/agenda/projetos')).data,
  });

  const { data: usuarios } = useQuery({
    queryKey: ['agenda', 'usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/agenda/usuarios')).data,
  });

  const createProjeto = useMutation({
    mutationFn: async (values: ProjetoFormValues) =>
      (
        await api.post<{ id: string }>('/agenda/projetos', {
          nome: values.nome,
          descricao: values.descricao || undefined,
          dataInicio: values.dataInicio,
          dataFim: values.dataFim || undefined,
          cor: values.cor,
          participanteIds: values.participanteIds,
          modeloId: values.modeloId || undefined,
        })
      ).data,
    onSuccess: (novoProjeto) => {
      queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos'] });
      setCreateOpen(false);
      router.push(`/agenda/projetos/${novoProjeto.id}`);
    },
  });

  return (
    <>
      <Header eyebrow="Agenda" title="Projetos" />
      <div className="scroll-suave flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/agenda" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> Voltar para a Agenda
          </Link>
          <Button variant="add" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
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
              onClick={() => router.push(`/agenda/projetos/${p.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.cor }} />
                  <h3 className="font-semibold text-text">{p.nome}</h3>
                </div>
                <Badge tone={PROJETO_STATUS_TONE[p.status]}>{PROJETO_STATUS_LABEL[p.status]}</Badge>
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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        usuarios={usuarios ?? []}
        projeto={null}
        onSave={(values) => createProjeto.mutate(values)}
        onSetParticipantes={() => {}}
        saving={createProjeto.isPending}
      />
    </>
  );
}
