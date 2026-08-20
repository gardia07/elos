'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { HumorRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

const NIVEIS = [
  { valor: 1, emoji: '😞', label: 'Péssimo' },
  { valor: 2, emoji: '😕', label: 'Ruim' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '🙂', label: 'Bom' },
  { valor: 5, emoji: '😄', label: 'Ótimo' },
];

export function HumorSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const hojeIso = localIso(new Date());
  const [data, setData] = useState(hojeIso);
  const [nivel, setNivel] = useState<number | null>(null);
  const [nota, setNota] = useState('');
  const [gratidao1, setGratidao1] = useState('');
  const [gratidao2, setGratidao2] = useState('');
  const [gratidao3, setGratidao3] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'humor', ano],
    queryFn: async () => (await api.get<HumorRegistro[]>('/planner/humor', { params: { ano } })).data,
  });

  const registroDoDia = registros?.find((r) => r.data.slice(0, 10) === data);

  useEffect(() => {
    setNivel(registroDoDia?.nivel ?? null);
    setNota(registroDoDia?.nota ?? '');
    setGratidao1(registroDoDia?.gratidao1 ?? '');
    setGratidao2(registroDoDia?.gratidao2 ?? '');
    setGratidao3(registroDoDia?.gratidao3 ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, registros]);

  const mediaRecente = useMemo(() => {
    const ultimos = (registros ?? []).slice(-7);
    if (ultimos.length === 0) return null;
    return ultimos.reduce((acc, r) => acc + r.nivel, 0) / ultimos.length;
  }, [registros]);

  const salvar = useMutation({
    mutationFn: async (nivelEscolhido: number) =>
      api.put('/planner/humor', {
        data,
        nivel: nivelEscolhido,
        nota: nota || undefined,
        gratidao1: gratidao1 || undefined,
        gratidao2: gratidao2 || undefined,
        gratidao3: gratidao3 || undefined,
      }),
    onSuccess: (_, nivelEscolhido) => {
      setNivel(nivelEscolhido);
      queryClient.invalidateQueries({ queryKey: ['planner', 'humor', ano] });
    },
  });

  const recentes = useMemo(() => (registros ?? []).slice().reverse().slice(0, 14), [registros]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          mediaRecente && (
            <>
              <span className="text-2xl font-semibold" style={{ color: tema.cor }}>
                {mediaRecente.toFixed(1)}
              </span>
              <p className="text-xs text-text-tertiary">média dos últimos 7 dias</p>
            </>
          )
        }
      />

      <Card className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Como você está hoje?</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={hojeIso}
            className="rounded-control border border-border-strong bg-surface px-2 py-1 text-sm"
          />
        </label>
        <div className="flex justify-between gap-2">
          {NIVEIS.map((n) => {
            const ativo = nivel === n.valor;
            return (
              <button
                key={n.valor}
                type="button"
                onClick={() => salvar.mutate(n.valor)}
                title={n.label}
                className={cn('flex flex-1 flex-col items-center gap-1 rounded-control border py-3 text-2xl transition', !ativo && 'border-border-strong bg-surface hover:border-accent')}
                style={ativo ? { borderColor: tema.cor, backgroundColor: `${tema.cor}18` } : undefined}
              >
                {n.emoji}
                <span className="text-[10px] text-text-tertiary">{n.label}</span>
              </button>
            );
          })}
        </div>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Alguma nota sobre o dia (opcional)…"
          rows={2}
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </Card>

      <Card className="flex flex-col gap-2.5">
        <div>
          <span className="text-sm font-semibold" style={{ color: tema.cor }}>
            Três coisas boas
          </span>
          <p className="text-xs text-text-tertiary">O que aconteceu hoje pelo qual você é grato — e por que foi bom.</p>
        </div>
        <input
          value={gratidao1}
          onChange={(e) => setGratidao1(e.target.value)}
          placeholder="1. Ex.: almoço com um amigo, porque…"
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={gratidao2}
          onChange={(e) => setGratidao2(e.target.value)}
          placeholder="2."
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={gratidao3}
          onChange={(e) => setGratidao3(e.target.value)}
          placeholder="3."
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <Button type="button" onClick={() => salvar.mutate(nivel ?? 3)} disabled={salvar.isPending} className="self-start">
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text">Últimos registros</span>
        {recentes.map((r) => (
          <Card key={r.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{NIVEIS.find((n) => n.valor === r.nivel)?.emoji}</span>
              <span className="text-sm text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {r.nota && <span className="flex-1 truncate text-sm text-text-secondary">{r.nota}</span>}
            </div>
            {(r.gratidao1 || r.gratidao2 || r.gratidao3) && (
              <ul className="ml-9 list-disc text-xs text-text-tertiary">
                {[r.gratidao1, r.gratidao2, r.gratidao3].filter(Boolean).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
        {recentes.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}
