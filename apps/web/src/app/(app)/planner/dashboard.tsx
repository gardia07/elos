'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui';
import type { Habito, HumorRegistro, Meta, PesoMedidaRegistro } from './types';
import type { SecaoTema } from './theme';
import { SECOES } from './theme';
import { SectionHeader } from './section-header';

const NIVEL_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

function corDe(id: string): string {
  return SECOES.find((s) => s.id === id)?.cor ?? '#92adc3';
}

export function DashboardSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const { data: metas } = useQuery({
    queryKey: ['planner', 'metas', ano],
    queryFn: async () => (await api.get<Meta[]>('/planner/metas', { params: { ano } })).data,
  });
  const { data: habitos } = useQuery({
    queryKey: ['planner', 'habitos', ano],
    queryFn: async () => (await api.get<Habito[]>('/planner/habitos', { params: { ano } })).data,
  });
  const { data: humor } = useQuery({
    queryKey: ['planner', 'humor', ano],
    queryFn: async () => (await api.get<HumorRegistro[]>('/planner/humor', { params: { ano } })).data,
  });
  const { data: pesoMedida } = useQuery({
    queryKey: ['planner', 'peso-medida', ano],
    queryFn: async () => (await api.get<PesoMedidaRegistro[]>('/planner/peso-medida', { params: { ano } })).data,
  });

  const metasConcluidas = metas?.filter((m) => m.concluida).length ?? 0;
  const melhorStreak = habitos && habitos.length > 0 ? Math.max(...habitos.map((h) => h.streakAtual)) : 0;
  const totalDiasMarcados = habitos?.reduce((acc, h) => acc + h.diasMarcados.length, 0) ?? 0;

  const humorRecente = useMemo(() => (humor ?? []).slice(-7), [humor]);
  const mediaHumor = humorRecente.length > 0 ? humorRecente.reduce((a, r) => a + r.nivel, 0) / humorRecente.length : null;

  const ultimoPeso = pesoMedida?.[pesoMedida.length - 1];
  const primeiroPeso = pesoMedida?.[0];
  const variacaoPeso = primeiroPeso?.pesoKg && ultimoPeso?.pesoKg ? Number(ultimoPeso.pesoKg) - Number(primeiroPeso.pesoKg) : null;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <SectionHeader tema={tema} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Metas concluídas</span>
          <span className="text-2xl font-semibold" style={{ color: corDe('metas') }}>
            {metasConcluidas}/{metas?.length ?? 0}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Melhor sequência</span>
          <span className="flex items-center gap-1 text-2xl font-semibold" style={{ color: corDe('habitos') }}>
            <Flame className="h-5 w-5" /> {melhorStreak}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Humor médio (7d)</span>
          <span className="text-2xl font-semibold" style={{ color: corDe('humor') }}>
            {mediaHumor ? `${mediaHumor.toFixed(1)} ${NIVEL_EMOJI[Math.round(mediaHumor)]}` : '—'}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">Peso (variação {ano})</span>
          <span className="text-2xl font-semibold" style={{ color: corDe('peso') }}>
            {variacaoPeso !== null ? `${variacaoPeso > 0 ? '+' : ''}${variacaoPeso.toFixed(1)} kg` : '—'}
          </span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-text">Hábitos em andamento</span>
        <div className="flex flex-col gap-2">
          {habitos?.map((h) => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: h.cor }} />
              <span className="flex-1 text-sm text-text">{h.nome}</span>
              <span className="text-xs text-text-tertiary">{h.diasMarcados.length} dia(s) no ano</span>
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: h.cor }}>
                <Flame className="h-3 w-3" /> {h.streakAtual}
              </span>
            </div>
          ))}
          {habitos?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum hábito cadastrado ainda.</p>}
        </div>
        {(habitos?.length ?? 0) > 0 && <p className="text-xs text-text-tertiary">{totalDiasMarcados} marcações no total em {ano}.</p>}
      </Card>

      {humorRecente.length > 0 && (
        <Card className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text">Humor recente</span>
          <div className="flex gap-2">
            {humorRecente.map((r) => (
              <div key={r.id} className="flex flex-col items-center gap-1">
                <span className="text-xl">{NIVEL_EMOJI[r.nivel]}</span>
                <span className="text-[10px] text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
