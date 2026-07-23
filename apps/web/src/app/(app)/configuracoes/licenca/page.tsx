'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, KpiCard } from '@/components/ui';
import { Header } from '@/components/header';

interface License {
  configured: boolean;
  blocked: boolean;
  status: 'TRIAL' | 'ATIVA' | 'SUSPENSA' | 'CANCELADA' | 'EXPIRADA';
  statusLabel: string;
  message: string;
  planCode: string | null;
  planName: string | null;
  expiraEm: string | null;
  maxUsuarios: number;
  maxColaboradores: number;
  usuarios: number;
  colaboradores: number;
  modulos: string[];
}

interface Plan {
  code: string;
  nome: string;
  descricao: string | null;
  maxUsuarios: number;
  maxColaboradores: number;
}

const STATUS_TONE: Record<License['status'], 'green' | 'blue' | 'amber' | 'red'> = {
  TRIAL: 'blue',
  ATIVA: 'green',
  SUSPENSA: 'red',
  CANCELADA: 'red',
  EXPIRADA: 'amber',
};

export default function LicencaPage() {
  const queryClient = useQueryClient();
  const [planCode, setPlanCode] = useState('');
  const [status, setStatus] = useState<License['status']>('ATIVA');

  const { data: license } = useQuery({
    queryKey: ['license'],
    queryFn: async () => (await api.get<License>('/license')).data,
  });
  const { data: plans } = useQuery({
    queryKey: ['license', 'plans'],
    queryFn: async () => (await api.get<Plan[]>('/license/plans')).data,
  });

  const update = useMutation({
    mutationFn: async () => api.patch('/license', { status, ...(planCode ? { planCode } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['license'] }),
  });

  if (!license) return <p className="p-8 text-sm text-text-tertiary">Carregando…</p>;

  return (
    <>
      <Header eyebrow="Configurações" title="Licença" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <Link href="/painel" className="text-sm text-text-secondary hover:text-text">
            ← Voltar para Área de trabalho
          </Link>

          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Plano" value={license.planName ?? '—'} />
            <KpiCard label="Usuários" value={`${license.usuarios} / ${license.maxUsuarios || '∞'}`} />
            <KpiCard label="Colaboradores ativos" value={`${license.colaboradores} / ${license.maxColaboradores || '∞'}`} />
            <KpiCard
              label="Expira em"
              value={license.expiraEm ? new Date(license.expiraEm).toLocaleDateString('pt-BR') : 'Sem expiração'}
            />
          </div>

          <Card className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Status</h3>
              <p className="text-sm text-text-secondary">{license.message}</p>
            </div>
            <Badge tone={STATUS_TONE[license.status]}>{license.statusLabel}</Badge>
          </Card>

          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Alterar plano / status</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Plano comercial</span>
                <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                  <option value="">Manter atual</option>
                  {plans?.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.nome} ({p.maxUsuarios} usuários · {p.maxColaboradores} colaboradores)
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as License['status'])} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                  <option value="TRIAL">Em teste</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="SUSPENSA">Suspensa</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </label>
              <Button onClick={() => update.mutate()} disabled={update.isPending}>
                Salvar
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
