'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Job {
  id: string;
  cargo: string;
  depto: string;
  contrato: 'CLT' | 'ESTAGIO';
  status: 'ABERTA' | 'EM_ANALISE' | 'ENCERRADA';
  _count: { candidates: number };
}

const STATUS_TONE = { ABERTA: 'green', EM_ANALISE: 'amber', ENCERRADA: 'grey' } as const;
const STATUS_LABEL = { ABERTA: 'Aberta', EM_ANALISE: 'Em análise', ENCERRADA: 'Encerrada' } as const;

export default function RecrutamentoPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [cargo, setCargo] = useState('');
  const [depto, setDepto] = useState('');
  const [contrato, setContrato] = useState<'CLT' | 'ESTAGIO'>('CLT');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['recruitment', 'jobs'],
    queryFn: async () => (await api.get<Job[]>('/rh/recruitment/jobs')).data,
  });

  const createJob = useMutation({
    mutationFn: async () => (await api.post('/rh/recruitment/jobs', { cargo, depto, contrato })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment', 'jobs'] });
      setShowForm(false);
      setCargo('');
      setDepto('');
    },
  });

  const abertas = jobs?.filter((j) => j.status === 'ABERTA').length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Vagas abertas</span>
          <div className="text-2xl font-semibold">{abertas}</div>
        </Card>
        <Card>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Total de vagas</span>
          <div className="text-2xl font-semibold">{jobs?.length ?? 0}</div>
        </Card>
        <Card>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Candidatos no pipeline</span>
          <div className="text-2xl font-semibold">{jobs?.reduce((s, j) => s + j._count.candidates, 0) ?? 0}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Vagas</h2>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova vaga'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createJob.mutate();
            }}
          >
            <TextField label="Cargo" value={cargo} onChange={setCargo} />
            <TextField label="Departamento" value={depto} onChange={setDepto} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Contrato</span>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value as 'CLT' | 'ESTAGIO')}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="CLT">CLT</option>
                <option value="ESTAGIO">Estágio</option>
              </select>
            </label>
            <Button type="submit" disabled={createJob.isPending}>
              Criar vaga
            </Button>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-sm text-text-tertiary">Carregando…</p>}

      <div className="grid grid-cols-2 gap-4">
        {jobs?.map((job) => (
          <Link key={job.id} href={`/gestao-de-pessoas/recrutamento/${job.id}`}>
            <Card className="flex flex-col gap-2 transition hover:border-accent">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-text">{job.cargo}</div>
                  <div className="text-sm text-text-secondary">{job.depto} · {job.contrato}</div>
                </div>
                <Badge tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
              </div>
              <div className="text-sm text-text-tertiary">{job._count.candidates} candidato(s) no pipeline</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
      />
    </label>
  );
}
