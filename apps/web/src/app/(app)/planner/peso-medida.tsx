'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { PesoMedidaRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

export function PesoMedidaSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(localIso(new Date()));
  const [pesoKg, setPesoKg] = useState('');
  const [cinturaCm, setCinturaCm] = useState('');
  const [quadrilCm, setQuadrilCm] = useState('');
  const [bracoCm, setBracoCm] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'peso-medida', ano],
    queryFn: async () => (await api.get<PesoMedidaRegistro[]>('/planner/peso-medida', { params: { ano } })).data,
  });

  const salvar = useMutation({
    mutationFn: async () =>
      api.put('/planner/peso-medida', {
        data,
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        cinturaCm: cinturaCm ? Number(cinturaCm) : undefined,
        quadrilCm: quadrilCm ? Number(quadrilCm) : undefined,
        bracoCm: bracoCm ? Number(bracoCm) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'peso-medida', ano] });
      setPesoKg('');
      setCinturaCm('');
      setQuadrilCm('');
      setBracoCm('');
    },
  });

  const primeiro = registros?.[0];
  const ultimo = registros?.[registros.length - 1];
  const variacaoPeso = primeiro && ultimo && primeiro.pesoKg && ultimo.pesoKg ? Number(ultimo.pesoKg) - Number(primeiro.pesoKg) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <SectionHeader
        tema={tema}
        stat={
          variacaoPeso !== null && (
            <>
              <span className="text-2xl font-semibold" style={{ color: tema.cor }}>
                {variacaoPeso > 0 ? '+' : ''}
                {variacaoPeso.toFixed(1)} kg
              </span>
              <p className="text-xs text-text-tertiary">desde o primeiro registro de {ano}</p>
            </>
          )
        }
      />

      {ultimo && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Peso</span>
            <span className="text-sm font-semibold text-text">{ultimo.pesoKg ? `${ultimo.pesoKg} kg` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Cintura</span>
            <span className="text-sm font-semibold text-text">{ultimo.cinturaCm ? `${ultimo.cinturaCm} cm` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Quadril</span>
            <span className="text-sm font-semibold text-text">{ultimo.quadrilCm ? `${ultimo.quadrilCm} cm` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Braço</span>
            <span className="text-sm font-semibold text-text">{ultimo.bracoCm ? `${ultimo.bracoCm} cm` : '—'}</span>
          </Card>
        </div>
      )}

      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Data</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              max={localIso(new Date())}
              className="w-44 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-4 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Peso (kg)</span>
              <input type="number" step="0.1" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Cintura (cm)</span>
              <input type="number" step="0.1" value={cinturaCm} onChange={(e) => setCinturaCm(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Quadril (cm)</span>
              <input type="number" step="0.1" value={quadrilCm} onChange={(e) => setQuadrilCm(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Braço (cm)</span>
              <input type="number" step="0.1" value={bracoCm} onChange={(e) => setBracoCm(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
          </div>
          <Button type="submit" disabled={salvar.isPending} className="self-start">
            {salvar.isPending ? 'Salvando…' : 'Salvar registro'}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text">Histórico de {ano}</span>
        {registros
          ?.slice()
          .reverse()
          .map((r) => (
            <Card key={r.id} className="flex items-center gap-4 py-3">
              <span className="text-sm text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {r.pesoKg && <span className="text-sm text-text">{r.pesoKg} kg</span>}
              {r.cinturaCm && <span className="text-sm text-text-secondary">Cintura {r.cinturaCm}cm</span>}
              {r.quadrilCm && <span className="text-sm text-text-secondary">Quadril {r.quadrilCm}cm</span>}
              {r.bracoCm && <span className="text-sm text-text-secondary">Braço {r.bracoCm}cm</span>}
            </Card>
          ))}
        {registros?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}
