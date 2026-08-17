'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookmarkPlus, Flag, LayoutGrid, Pencil, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button, Drawer } from '@/components/ui';
import { Header } from '@/components/header';
import { EventFormDrawer, type EventFormValues, lembretesInputFromValues, recorrenciaFromValues } from '../../components';
import { useIsDarkTheme } from '../../lib';
import type { AgendaItem, Categoria, Projeto, Usuario } from '../../types';
import { PROJETO_STATUS_LABEL, PROJETO_STATUS_TONE } from '../../types';
import { ProjetoDrawer, type ProjetoFormValues } from '../components';
import { ProjetoKanban } from './kanban';
import { ProjetoMarcos } from './marcos';

export default function ProjetoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isDark = useIsDarkTheme();

  const [taskDrawer, setTaskDrawer] = useState<{ open: boolean; item: AgendaItem | null }>({ open: false, item: null });
  const [editOpen, setEditOpen] = useState(false);
  const [modeloOpen, setModeloOpen] = useState(false);
  const [modeloNome, setModeloNome] = useState('');

  const { data: projetos } = useQuery({
    queryKey: ['agenda', 'projetos'],
    queryFn: async () => (await api.get<Projeto[]>('/agenda/projetos')).data,
  });
  const projeto = projetos?.find((p) => p.id === id);

  const { data: tarefas } = useQuery({
    queryKey: ['agenda', 'projetos', id, 'tarefas'],
    queryFn: async () => (await api.get<AgendaItem[]>(`/agenda/projetos/${id}/tarefas`)).data,
  });

  const { data: categorias } = useQuery({
    queryKey: ['agenda', 'categorias'],
    queryFn: async () => (await api.get<Categoria[]>('/agenda/categorias')).data,
  });
  const { data: usuarios } = useQuery({
    queryKey: ['agenda', 'usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/agenda/usuarios')).data,
  });

  const invalidateTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda', 'projetos'] });
    queryClient.invalidateQueries({ queryKey: ['ferramentas', 'agenda-geral'] });
  };

  const createItem = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post('/agenda/items', payload)).data,
    onSuccess: () => {
      invalidateTudo();
      setTaskDrawer({ open: false, item: null });
    },
  });
  const updateItem = useMutation({
    mutationFn: async (vars: { id: string; payload: Record<string, unknown> }) => (await api.patch(`/agenda/items/${vars.id}`, vars.payload)).data,
    onSuccess: () => {
      invalidateTudo();
      setTaskDrawer({ open: false, item: null });
    },
  });
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => api.delete(`/agenda/items/${itemId}`),
    onSuccess: () => {
      invalidateTudo();
      setTaskDrawer({ open: false, item: null });
    },
  });

  const updateProjeto = useMutation({
    mutationFn: async (values: ProjetoFormValues) =>
      api.patch(`/agenda/projetos/${id}`, {
        nome: values.nome,
        descricao: values.descricao || undefined,
        dataInicio: values.dataInicio,
        dataFim: values.dataFim || undefined,
        status: values.status,
        cor: values.cor,
      }),
    onSuccess: () => {
      invalidateTudo();
      setEditOpen(false);
    },
  });
  const deleteProjeto = useMutation({
    mutationFn: async () => api.delete(`/agenda/projetos/${id}`),
    onSuccess: () => {
      invalidateTudo();
      router.push('/agenda/projetos');
    },
  });
  const setParticipantes = useMutation({
    mutationFn: async (participanteIds: string[]) => api.put(`/agenda/projetos/${id}/participantes`, { participanteIds }),
    onSuccess: invalidateTudo,
  });

  const salvarModelo = useMutation({
    mutationFn: async () => api.post(`/agenda/projetos/${id}/salvar-como-modelo`, { nome: modeloNome }),
    onSuccess: () => {
      setModeloOpen(false);
      setModeloNome('');
    },
  });

  function handleSaveTask(values: EventFormValues) {
    const payload: Record<string, unknown> = {
      data: values.data,
      hora: values.diaInteiro ? null : values.hora || null,
      horaFim: values.diaInteiro ? null : values.horaFim || null,
      descricao: values.descricao,
      notas: values.notas || null,
      tipo: values.tipo,
      categoriaId: values.categoriaId || null,
      responsavelId: values.responsavelId || null,
      projetoId: values.projetoId || null,
      lembretes: lembretesInputFromValues(values),
    };
    if (taskDrawer.item) {
      updateItem.mutate({ id: taskDrawer.item.id, payload });
    } else {
      const recorrencia = recorrenciaFromValues(values);
      if (recorrencia) payload.recorrencia = recorrencia;
      createItem.mutate(payload);
    }
  }

  if (!projeto) {
    return (
      <>
        <Header eyebrow="Agenda" title="Projeto" />
        <div className="flex flex-1 items-center justify-center text-sm text-text-tertiary">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <Header eyebrow="Agenda" title={projeto.nome} />
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/agenda/projetos" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> Voltar para Projetos
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setModeloOpen(true)} className="flex items-center gap-1.5">
              <BookmarkPlus className="h-4 w-4" /> Salvar como modelo
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)} className="flex items-center gap-1.5">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button onClick={() => setTaskDrawer({ open: true, item: null })} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: projeto.cor }} />
          <Badge tone={projeto.atrasado ? 'red' : PROJETO_STATUS_TONE[projeto.status]}>{projeto.atrasado ? 'Atrasado' : PROJETO_STATUS_LABEL[projeto.status]}</Badge>
          {projeto.descricao && <span className="text-sm text-text-secondary">{projeto.descricao}</span>}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-text-tertiary">
            <Users className="h-3.5 w-3.5" /> {projeto.participantes.map((p) => p.nome).join(', ')}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
          <LayoutGrid className="h-4 w-4" /> Quadro
        </div>
        <ProjetoKanban projetoId={id} tarefas={tarefas ?? []} onCardClick={(t) => setTaskDrawer({ open: true, item: t })} />

        <div className="mb-3 mt-8 flex items-center gap-1.5 text-sm font-semibold text-text">
          <Flag className="h-4 w-4" /> Marcos
        </div>
        <ProjetoMarcos projetoId={id} />
      </div>

      <EventFormDrawer
        open={taskDrawer.open}
        onClose={() => setTaskDrawer({ open: false, item: null })}
        categorias={categorias ?? []}
        usuarios={usuarios ?? []}
        projetos={projetos ?? []}
        isDark={isDark}
        item={taskDrawer.item}
        defaultProjetoId={id}
        onSave={handleSaveTask}
        onDelete={taskDrawer.item ? () => deleteItem.mutate(taskDrawer.item!.id) : undefined}
        saving={createItem.isPending || updateItem.isPending}
      />

      <ProjetoDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        usuarios={usuarios ?? []}
        currentUserId={user?.id}
        projeto={projeto}
        onSave={(values) => updateProjeto.mutate(values)}
        onDelete={projeto.criadoPorId === user?.id ? () => deleteProjeto.mutate() : undefined}
        onSetParticipantes={(ids) => setParticipantes.mutate(ids)}
        saving={updateProjeto.isPending}
      />

      <Drawer open={modeloOpen} onClose={() => setModeloOpen(false)} title="Salvar como modelo">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvarModelo.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Nome do modelo</span>
            <input
              value={modeloNome}
              onChange={(e) => setModeloNome(e.target.value)}
              required
              autoFocus
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <p className="text-xs text-text-tertiary">
            As tarefas e marcos atuais do projeto são salvos como modelo, guardando a distância em dias até o início do projeto — para recriar tudo com datas novas da próxima vez.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModeloOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarModelo.isPending}>
              {salvarModelo.isPending ? 'Salvando…' : 'Salvar modelo'}
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
