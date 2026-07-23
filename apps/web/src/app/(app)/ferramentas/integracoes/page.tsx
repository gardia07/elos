'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui';

interface Integration {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  conectado: boolean;
  ultimaSincronizacaoEm: string | null;
}

export default function IntegracoesPage() {
  const queryClient = useQueryClient();
  const { data: integrations } = useQuery({
    queryKey: ['ferramentas', 'integrations'],
    queryFn: async () => (await api.get<Integration[]>('/ferramentas/integrations')).data,
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; conectado: boolean }) => api.patch(`/ferramentas/integrations/${vars.id}`, { conectado: vars.conectado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ferramentas', 'integrations'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Conectores</h3>
        <p className="text-sm text-text-secondary">Integrações com ERP, sistemas bancários e plataformas de benefícios.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {integrations?.map((i) => (
          <Card key={i.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">{i.tipo}</div>
                <div className="font-medium">{i.nome}</div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: i.id, conectado: !i.conectado })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${i.conectado ? 'bg-success' : 'bg-surface-alt'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${i.conectado ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-sm text-text-secondary">{i.descricao}</p>
            <div className="text-xs">
              <span className={i.conectado ? 'font-medium text-success' : 'font-medium text-text-tertiary'}>
                {i.conectado ? 'Conectado' : 'Desconectado'}
              </span>
              <span className="text-text-tertiary">
                {' '}
                · Última sincronização: {i.ultimaSincronizacaoEm ? new Date(i.ultimaSincronizacaoEm).toLocaleString('pt-BR') : '—'}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
