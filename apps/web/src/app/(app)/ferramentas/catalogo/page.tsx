'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui';
import { CATALOG_BLOCKS } from './catalog-data';
import { ExternalIcon, ToolIcon } from './external-icons';
import { AtalhoDrawer, type AtalhoFormValues } from './components';
import type { AtalhoExterno } from './types';

interface License {
  modulos: string[];
}

export default function CatalogoFerramentasPage() {
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<{ open: boolean; atalho: AtalhoExterno | null }>({ open: false, atalho: null });

  const { data: license } = useQuery({
    queryKey: ['license'],
    queryFn: async () => (await api.get<License>('/license')).data,
  });

  const { data: atalhos } = useQuery({
    queryKey: ['ferramentas', 'atalhos-externos'],
    queryFn: async () => (await api.get<AtalhoExterno[]>('/ferramentas/atalhos-externos')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ferramentas', 'atalhos-externos'] });

  const createAtalho = useMutation({
    mutationFn: async (values: AtalhoFormValues) => api.post('/ferramentas/atalhos-externos', values),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, atalho: null });
    },
  });
  const updateAtalho = useMutation({
    mutationFn: async (vars: { id: string; values: AtalhoFormValues }) => api.patch(`/ferramentas/atalhos-externos/${vars.id}`, vars.values),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, atalho: null });
    },
  });
  const deleteAtalho = useMutation({
    mutationFn: async (id: string) => api.delete(`/ferramentas/atalhos-externos/${id}`),
    onSuccess: () => {
      invalidate();
      setDrawer({ open: false, atalho: null });
    },
  });

  const modulos = license?.modulos ?? [];
  const blocks = CATALOG_BLOCKS.filter((b) => b.modulo === null || modulos.includes(b.modulo));

  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => (
        <section key={block.titulo} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">{block.titulo}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {block.ferramentas.map((tool) =>
              tool.href ? (
                <Link
                  key={tool.nome}
                  href={tool.href}
                  className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-4 transition hover:border-accent"
                >
                  <ToolIcon nome={tool.nome} className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium text-text">{tool.nome}</span>
                </Link>
              ) : (
                <div key={tool.nome} className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface-alt p-4 opacity-60">
                  <ToolIcon nome={tool.nome} className="h-5 w-5 text-text-tertiary" />
                  <span className="text-sm font-medium text-text-secondary">{tool.nome}</span>
                  <span className="text-xs text-text-tertiary">Em breve</span>
                </div>
              ),
            )}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Atalhos externos</h3>
          <Button variant="secondary" className="flex items-center gap-1.5" onClick={() => setDrawer({ open: true, atalho: null })}>
            <Plus className="h-4 w-4" /> Novo atalho
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {atalhos?.map((a) => (
            <div key={a.id} className="group relative flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-4 transition hover:border-accent">
              <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col gap-2">
                <ExternalIcon nome={a.icone} className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-text">{a.nome}</span>
              </a>
              <button
                type="button"
                onClick={() => setDrawer({ open: true, atalho: a })}
                className="absolute right-3 top-3 hidden text-xs text-text-tertiary hover:text-accent group-hover:block"
              >
                Editar
              </button>
            </div>
          ))}
          {atalhos?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum atalho configurado ainda.</p>}
        </div>
      </section>

      <AtalhoDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, atalho: null })}
        atalho={drawer.atalho}
        saving={createAtalho.isPending || updateAtalho.isPending}
        onSave={(values) => {
          if (drawer.atalho) updateAtalho.mutate({ id: drawer.atalho.id, values });
          else createAtalho.mutate(values);
        }}
        onDelete={drawer.atalho && !drawer.atalho.sistema ? () => deleteAtalho.mutate(drawer.atalho!.id) : undefined}
      />
    </div>
  );
}
