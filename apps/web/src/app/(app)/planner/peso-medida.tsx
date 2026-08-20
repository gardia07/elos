'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Droplet } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import type { PesoMedidaRegistro } from './types';
import type { SecaoTema } from './theme';
import { SectionHeader } from './section-header';
import { localIso } from './lib';

function classificacaoImc(imc: number): string {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidade';
}

const META_AGUA_ML = 2000;

export function PesoMedidaSection({ ano, tema }: { ano: number; tema: SecaoTema }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(localIso(new Date()));
  const [pesoKg, setPesoKg] = useState('');
  const [alturaCm, setAlturaCm] = useState('');
  const [cinturaCm, setCinturaCm] = useState('');
  const [quadrilCm, setQuadrilCm] = useState('');
  const [bracoCm, setBracoCm] = useState('');
  const [aguaMl, setAguaMl] = useState('');

  const { data: registros } = useQuery({
    queryKey: ['planner', 'peso-medida', ano],
    queryFn: async () => (await api.get<PesoMedidaRegistro[]>('/planner/peso-medida', { params: { ano } })).data,
  });

  // Altura muda raramente — pré-preenche com o último valor conhecido, mas a pessoa pode corrigir a qualquer momento.
  useEffect(() => {
    if (!alturaCm && registros) {
      const ultimaAltura = registros.slice().reverse().find((r) => r.alturaCm)?.alturaCm;
      if (ultimaAltura) setAlturaCm(String(ultimaAltura));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros]);

  const salvar = useMutation({
    mutationFn: async () =>
      api.put('/planner/peso-medida', {
        data,
        pesoKg: pesoKg ? Number(pesoKg) : undefined,
        alturaCm: alturaCm ? Number(alturaCm) : undefined,
        cinturaCm: cinturaCm ? Number(cinturaCm) : undefined,
        quadrilCm: quadrilCm ? Number(quadrilCm) : undefined,
        bracoCm: bracoCm ? Number(bracoCm) : undefined,
        aguaMl: aguaMl ? Number(aguaMl) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'peso-medida', ano] });
      setPesoKg('');
      setCinturaCm('');
      setQuadrilCm('');
      setBracoCm('');
      setAguaMl('');
    },
  });

  const primeiro = registros?.[0];
  const ultimo = registros?.[registros.length - 1];
  const variacaoPeso = primeiro && ultimo && primeiro.pesoKg && ultimo.pesoKg ? Number(ultimo.pesoKg) - Number(primeiro.pesoKg) : null;

  const imc = useMemo(() => {
    if (!ultimo?.pesoKg || !ultimo?.alturaCm) return null;
    const alturaM = Number(ultimo.alturaCm) / 100;
    return Number(ultimo.pesoKg) / (alturaM * alturaM);
  }, [ultimo]);

  const aguaHoje = registros?.find((r) => r.data.slice(0, 10) === data)?.aguaMl ?? 0;
  const pctAgua = Math.min(100, Math.round((aguaHoje / META_AGUA_ML) * 100));

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

      {(ultimo || imc) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Peso</span>
            <span className="text-sm font-semibold text-text">{ultimo?.pesoKg ? `${ultimo.pesoKg} kg` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">IMC</span>
            <span className="text-sm font-semibold text-text">{imc ? imc.toFixed(1) : '—'}</span>
            {imc && <span className="text-[10px] text-text-tertiary">{classificacaoImc(imc)}</span>}
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Cintura</span>
            <span className="text-sm font-semibold text-text">{ultimo?.cinturaCm ? `${ultimo.cinturaCm} cm` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Quadril</span>
            <span className="text-sm font-semibold text-text">{ultimo?.quadrilCm ? `${ultimo.quadrilCm} cm` : '—'}</span>
          </Card>
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-text-tertiary">Braço</span>
            <span className="text-sm font-semibold text-text">{ultimo?.bracoCm ? `${ultimo.bracoCm} cm` : '—'}</span>
          </Card>
        </div>
      )}

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
            <Droplet className="h-4 w-4 text-accent" /> Água hoje
          </span>
          <span className="text-xs text-text-tertiary">
            {aguaHoje} de {META_AGUA_ML} ml
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pctAgua}%` }} />
        </div>
      </Card>

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
              className="w-44 rounded-control border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Peso (kg)</span>
              <input type="number" step="0.1" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Altura (cm)</span>
              <input type="number" step="0.1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Cintura (cm)</span>
              <input type="number" step="0.1" value={cinturaCm} onChange={(e) => setCinturaCm(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Quadril (cm)</span>
              <input type="number" step="0.1" value={quadrilCm} onChange={(e) => setQuadrilCm(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Braço (cm)</span>
              <input type="number" step="0.1" value={bracoCm} onChange={(e) => setBracoCm(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Água (ml)</span>
              <input type="number" step="50" value={aguaMl} onChange={(e) => setAguaMl(e.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
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
            <Card key={r.id} className="flex flex-wrap items-center gap-4 py-3">
              <span className="text-sm text-text-tertiary">{new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
              {r.pesoKg && <span className="text-sm text-text">{r.pesoKg} kg</span>}
              {r.cinturaCm && <span className="text-sm text-text-secondary">Cintura {r.cinturaCm}cm</span>}
              {r.quadrilCm && <span className="text-sm text-text-secondary">Quadril {r.quadrilCm}cm</span>}
              {r.bracoCm && <span className="text-sm text-text-secondary">Braço {r.bracoCm}cm</span>}
              {r.aguaMl && <span className="text-sm text-text-secondary">💧 {r.aguaMl}ml</span>}
            </Card>
          ))}
        {registros?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}
