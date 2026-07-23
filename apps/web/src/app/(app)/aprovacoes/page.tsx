'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, KpiCard } from '@/components/ui';
import { Header } from '@/components/header';

interface ApprovalItem {
  id: string;
  tipo: 'FERIAS' | 'PONTO' | 'VAGA';
  hub: string;
  titulo: string;
  solicitante: string;
  valor: string | null;
  prioridade: string;
  prazo: string | null;
  slaRisco: boolean;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  createdAt: string;
}

interface Kpis {
  pendentesTotal: number;
  slaEmRisco: number;
  concluidasMes: number;
}

const TIPO_LABEL = { FERIAS: 'Férias', PONTO: 'Ponto', VAGA: 'Vaga' } as const;
const STATUS_LABEL = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', RECUSADA: 'Recusada' } as const;

type Filtro = 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'TODOS';

export default function AprovacoesPage() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>('PENDENTE');
  const [hubFiltro, setHubFiltro] = useState<string>('Todos');

  const { data: items } = useQuery({
    queryKey: ['aprovacoes'],
    queryFn: async () => (await api.get<ApprovalItem[]>('/aprovacoes')).data,
  });
  const { data: kpis } = useQuery({
    queryKey: ['aprovacoes', 'kpis'],
    queryFn: async () => (await api.get<Kpis>('/aprovacoes/kpis')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['aprovacoes'] });
    queryClient.invalidateQueries({ queryKey: ['aprovacoes', 'kpis'] });
  };

  const approve = useMutation({
    mutationFn: async (item: ApprovalItem) => api.post(`/aprovacoes/${item.tipo}/${item.id}/approve`),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: async (item: ApprovalItem) => api.post(`/aprovacoes/${item.tipo}/${item.id}/reject`),
    onSuccess: invalidate,
  });

  const hubs = ['Todos', ...Array.from(new Set(items?.map((i) => i.hub) ?? []))];
  const filtered = (items ?? []).filter((i) => (filtro === 'TODOS' || i.status === filtro) && (hubFiltro === 'Todos' || i.hub === hubFiltro));

  return (
    <>
      <Header eyebrow="Motor de workflow" title="Aprovações" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Pendentes no total" value={kpis?.pendentesTotal ?? '—'} />
            <KpiCard label="SLA em risco" value={kpis?.slaEmRisco ?? '—'} />
            <KpiCard label="Concluídas no mês" value={kpis?.concluidasMes ?? '—'} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['PENDENTE', 'APROVADA', 'RECUSADA', 'TODOS'] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  filtro === f ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text hover:border-accent'
                }`}
              >
                {f === 'TODOS' ? 'Todos' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {hubs.map((h) => (
              <button
                key={h}
                onClick={() => setHubFiltro(h)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  hubFiltro === h ? 'border-accent bg-accent text-on-accent font-medium' : 'border-border-strong bg-surface text-text-secondary hover:border-accent'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map((item) => (
              <Card key={`${item.tipo}-${item.id}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge tone="blue">{TIPO_LABEL[item.tipo]}</Badge>
                  <div>
                    <div className="font-medium">{item.titulo}</div>
                    <div className="text-xs text-text-tertiary">
                      {item.hub} · {item.solicitante}
                      {item.prazo && ` · prazo ${new Date(item.prazo).toLocaleDateString('pt-BR')}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.valor && <span className="text-sm text-text-secondary">{item.valor}</span>}
                  <Badge tone={item.prioridade === 'Alta' ? 'red' : 'grey'}>{item.prioridade}</Badge>
                  {item.slaRisco && <Badge tone="amber">SLA em risco</Badge>}
                  {item.status === 'PENDENTE' ? (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => reject.mutate(item)} disabled={reject.isPending || approve.isPending}>
                        Recusar
                      </Button>
                      <Button onClick={() => approve.mutate(item)} disabled={reject.isPending || approve.isPending}>
                        Aprovar
                      </Button>
                    </div>
                  ) : (
                    <Badge tone={item.status === 'APROVADA' ? 'green' : 'red'}>{STATUS_LABEL[item.status]}</Badge>
                  )}
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nada por aqui.</p>}
          </div>
        </div>
      </main>
    </>
  );
}
