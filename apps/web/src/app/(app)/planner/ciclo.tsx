'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { CicloRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

export function CicloSection({ tema }: { tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [dataInicio, setDataInicio] = useState(localIso(new Date()));
  const [duracaoDias, setDuracaoDias] = useState('');
  const [sintomas, setSintomas] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'ciclo'],
    queryFn: async () => (await api.get<CicloRegistro[]>('/planner/ciclo')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['planner', 'ciclo'] });

  const criar = useMutation({
    mutationFn: async () =>
      api.post('/planner/ciclo', { dataInicio, duracaoDias: duracaoDias ? Number(duracaoDias) : undefined, sintomas: sintomas || undefined }),
    onSuccess: () => {
      invalidate();
      setDuracaoDias('');
      setSintomas('');
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => api.delete(`/planner/ciclo/${id}`),
    onSuccess: invalidate,
  });

  // Estimativa simples: média de intervalo entre os últimos registros (ordenados desc pela API).
  const previsao = useMemo(() => {
    if (!registros || registros.length < 2) return null;
    const datas = registros.map((r) => new Date(r.dataInicio).getTime()).sort((a, b) => b - a);
    const intervalos: number[] = [];
    for (let i = 0; i < datas.length - 1; i++) intervalos.push((datas[i] - datas[i + 1]) / 86_400_000);
    const media = Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length);
    const proxima = new Date(datas[0] + media * 86_400_000);
    return { media, proxima };
  }, [registros]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          previsao && (
            <>
              <span className="text-lg font-semibold" style={{ color: tema.cor }}>
                {previsao.proxima.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </span>
              <p className="text-xs text-text-tertiary">próximo previsto · ciclo de {previsao.media} dias</p>
            </>
          )
        }
      />

      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            criar.mutate();
          }}
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Início</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Duração (dias)</span>
              <input
                type="number"
                min={1}
                max={15}
                value={duracaoDias}
                onChange={(e) => setDuracaoDias(e.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Sintomas (opcional)</span>
            <input
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={criar.isPending} className="flex items-center gap-1.5 self-start">
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        {registros?.map((r) => (
          <Card key={r.id} className="flex items-center justify-between py-4">
            <div className="text-sm">
              <span className="font-medium text-text">{new Date(r.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {r.duracaoDias && <span className="text-text-tertiary"> · {r.duracaoDias} dia(s)</span>}
              {r.sintomas && <p className="text-xs text-text-tertiary">{r.sintomas}</p>}
            </div>
            <button type="button" onClick={() => excluir.mutate(r.id)} className="text-text-tertiary hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
        {registros?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}
