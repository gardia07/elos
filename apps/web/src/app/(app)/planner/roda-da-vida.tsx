'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { RodaDaVidaAvaliacao } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { RadarChart } from './radar-chart';
import { localIso } from './lib';

const CAMPOS: { key: keyof Omit<RodaDaVidaAvaliacao, 'id' | 'data'>; label: string }[] = [
  { key: 'carreira', label: 'Carreira' },
  { key: 'financas', label: 'Finanças' },
  { key: 'saude', label: 'Saúde' },
  { key: 'familiaAmigos', label: 'Família e amigos' },
  { key: 'relacionamento', label: 'Relacionamento' },
  { key: 'crescimentoPessoal', label: 'Crescimento pessoal' },
  { key: 'lazer', label: 'Lazer' },
  { key: 'ambienteFisico', label: 'Ambiente físico' },
];

type Notas = Record<(typeof CAMPOS)[number]['key'], number>;

export function RodaDaVidaSection({ tema }: { tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [notas, setNotas] = useState<Notas>({
    carreira: 5,
    financas: 5,
    saude: 5,
    familiaAmigos: 5,
    relacionamento: 5,
    crescimentoPessoal: 5,
    lazer: 5,
    ambienteFisico: 5,
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ['planner', 'roda-da-vida'],
    queryFn: async () => (await api.get<RodaDaVidaAvaliacao[]>('/planner/roda-da-vida')).data,
  });

  const salvar = useMutation({
    mutationFn: async () => api.put('/planner/roda-da-vida', { data: localIso(new Date()), ...notas }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner', 'roda-da-vida'] }),
  });

  const ultima = avaliacoes?.[0];
  const pontosGrafico = CAMPOS.map((c) => ({ label: c.label, valor: ultima ? ultima[c.key] : notas[c.key] }));
  const media = useMemo(() => {
    const valores = ultima ? CAMPOS.map((c) => ultima[c.key]) : Object.values(notas);
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  }, [ultima, notas]);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          <>
            <span className="text-2xl font-semibold" style={{ color: tema.cor }}>
              {media.toFixed(1)}
            </span>
            <p className="text-xs text-text-tertiary">média geral</p>
          </>
        }
      />

      <Card>
        <RadarChart pontos={pontosGrafico} cor={tema.cor} />
      </Card>

      <Card className="flex flex-col gap-4">
        <span className="text-sm font-semibold text-text">
          {ultima?.data.slice(0, 10) === localIso(new Date()) ? 'Atualizar avaliação de hoje' : 'Nova avaliação'}
        </span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <label key={c.key} className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center justify-between text-text-secondary">
                {c.label}
                <span className="font-semibold text-text">{notas[c.key]}</span>
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={notas[c.key]}
                onChange={(e) => setNotas((n) => ({ ...n, [c.key]: Number(e.target.value) }))}
                style={{ accentColor: tema.cor }}
              />
            </label>
          ))}
        </div>
        <Button type="button" onClick={() => salvar.mutate()} disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar avaliação'}
        </Button>
      </Card>

      {avaliacoes && avaliacoes.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Avaliações anteriores</span>
          {avaliacoes.slice(1).map((a) => {
            const m = CAMPOS.reduce((acc, c) => acc + a[c.key], 0) / CAMPOS.length;
            return (
              <Card key={a.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-text-tertiary">{new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                <span className="text-sm font-medium text-text">média {m.toFixed(1)}</span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
