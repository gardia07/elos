'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface RiskEntry {
  id: string;
  setor: string;
  riscos: string;
  nivel: 'ALTO' | 'MEDIO' | 'BAIXO';
}

const NIVEL_LABEL = { ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo' } as const;
const NIVEL_TONE = { ALTO: 'red', MEDIO: 'amber', BAIXO: 'green' } as const;

export default function MapaRiscosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [setor, setSetor] = useState('');
  const [riscos, setRiscos] = useState('');
  const [nivel, setNivel] = useState<RiskEntry['nivel']>('MEDIO');

  const { data: entries } = useQuery({
    queryKey: ['sst', 'risk-map'],
    queryFn: async () => (await api.get<RiskEntry[]>('/sst/risk-map')).data,
  });
  const { data: settings } = useQuery({
    queryKey: ['sst', 'risk-map', 'settings'],
    queryFn: async () => (await api.get<{ mapaRiscosEsocialSentAt: string | null }>('/sst/risk-map/settings')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/sst/risk-map', { setor, riscos, nivel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst', 'risk-map'] });
      setShowForm(false);
      setSetor('');
      setRiscos('');
    },
  });

  const sendEsocial = useMutation({
    mutationFn: async () => api.post('/sst/risk-map/esocial'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sst', 'risk-map', 'settings'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Condições ambientais de trabalho</h3>
          <p className="text-sm text-text-secondary">Evento eSocial S-2240</p>
        </div>
        {settings?.mapaRiscosEsocialSentAt ? (
          <Badge tone="green">Enviado em {new Date(settings.mapaRiscosEsocialSentAt).toLocaleDateString('pt-BR')}</Badge>
        ) : (
          <Button onClick={() => sendEsocial.mutate()} disabled={sendEsocial.isPending}>
            Enviar evento S-2240
          </Button>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo risco'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Setor</span>
              <input value={setor} onChange={(e) => setSetor(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Riscos identificados</span>
              <input value={riscos} onChange={(e) => setRiscos(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Nível</span>
              <select value={nivel} onChange={(e) => setNivel(e.target.value as RiskEntry['nivel'])} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
              </select>
            </label>
            <Button type="submit" disabled={create.isPending}>
              Adicionar
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Setor</th>
              <th className="px-5 py-3 font-medium">Riscos</th>
              <th className="px-5 py-3 font-medium">Nível</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{e.setor}</td>
                <td className="px-5 py-3 text-text-secondary">{e.riscos}</td>
                <td className="px-5 py-3">
                  <Badge tone={NIVEL_TONE[e.nivel]}>{NIVEL_LABEL[e.nivel]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum risco mapeado.</p>}
      </Card>
    </div>
  );
}
