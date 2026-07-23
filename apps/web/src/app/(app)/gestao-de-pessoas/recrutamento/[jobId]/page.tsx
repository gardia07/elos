'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface Candidate {
  id: string;
  nome: string;
  origem: string | null;
  stage: 'TRIAGEM' | 'ENTREVISTA' | 'PROPOSTA' | 'CONTRATADO' | 'REPROVADO';
  email: string | null;
  telefone: string | null;
  resumo: string | null;
  notas: string | null;
  scoreComunicacao: number;
  scoreTecnica: number;
  scoreCultura: number;
}

interface JobDetail {
  id: string;
  cargo: string;
  depto: string;
  kanban: Record<Candidate['stage'], Candidate[]>;
  costs: { id: string; categoria: string; descricao: string | null; valor: string }[];
  costTotal: number;
  costPerHire: number;
}

const COLUMNS: { key: Candidate['stage']; label: string }[] = [
  { key: 'TRIAGEM', label: 'Triagem' },
  { key: 'ENTREVISTA', label: 'Entrevista' },
  { key: 'PROPOSTA', label: 'Proposta' },
  { key: 'CONTRATADO', label: 'Contratado' },
  { key: 'REPROVADO', label: 'Reprovado' },
];

export default function JobKanbanPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const [openCandidate, setOpenCandidate] = useState<Candidate | null>(null);
  const [newCandidateNome, setNewCandidateNome] = useState('');
  const [newCandidateOrigem, setNewCandidateOrigem] = useState('');

  const { data: job } = useQuery({
    queryKey: ['recruitment', 'job', jobId],
    queryFn: async () => (await api.get<JobDetail>(`/rh/recruitment/jobs/${jobId}`)).data,
    enabled: !!jobId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['recruitment', 'job', jobId] });

  const addCandidate = useMutation({
    mutationFn: async () =>
      api.post(`/rh/recruitment/jobs/${jobId}/candidates`, { nome: newCandidateNome, origem: newCandidateOrigem || undefined }),
    onSuccess: () => {
      invalidate();
      setNewCandidateNome('');
      setNewCandidateOrigem('');
    },
  });

  const advance = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/recruitment/candidates/${id}/advance`, {}),
    onSuccess: () => {
      invalidate();
      setOpenCandidate(null);
    },
  });
  const reject = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/recruitment/candidates/${id}/reject`, {}),
    onSuccess: () => {
      invalidate();
      setOpenCandidate(null);
    },
  });
  const talentBank = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/recruitment/candidates/${id}/talent-bank`, {}),
    onSuccess: () => {
      invalidate();
      setOpenCandidate(null);
    },
  });
  const block = useMutation({
    mutationFn: async (id: string) => api.post(`/rh/recruitment/candidates/${id}/block`, {}),
    onSuccess: () => {
      invalidate();
      setOpenCandidate(null);
    },
  });

  if (!job) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/gestao-de-pessoas/recrutamento" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Recrutamento & Seleção
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{job.cargo}</h2>
          <p className="text-sm text-text-secondary">{job.depto}</p>
        </div>
        <Card className="flex gap-6 py-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">Custo total</div>
            <div className="font-semibold">{formatBRL(job.costTotal)}</div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">Custo por contratação</div>
            <div className="font-semibold">{formatBRL(job.costPerHire)}</div>
          </div>
        </Card>
      </div>

      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            addCandidate.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Nome do candidato</span>
            <input
              value={newCandidateNome}
              onChange={(e) => setNewCandidateNome(e.target.value)}
              required
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Origem</span>
            <input
              value={newCandidateOrigem}
              onChange={(e) => setNewCandidateOrigem(e.target.value)}
              placeholder="LinkedIn, Indicação…"
              className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={addCandidate.isPending}>
            Adicionar à triagem
          </Button>
        </form>
      </Card>

      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-text-secondary">
              {col.label} <span className="text-text-tertiary">({job.kanban[col.key]?.length ?? 0})</span>
            </div>
            <div className="flex flex-col gap-2">
              {job.kanban[col.key]?.map((c) => (
                <button key={c.id} onClick={() => setOpenCandidate(c)} className="text-left">
                  <Card className="p-3 hover:border-accent">
                    <div className="text-sm font-medium">{c.nome}</div>
                    {c.origem && <div className="text-xs text-text-tertiary">{c.origem}</div>}
                  </Card>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Drawer open={!!openCandidate} onClose={() => setOpenCandidate(null)} title={openCandidate?.nome ?? ''}>
        {openCandidate && (
          <div className="flex flex-col gap-4">
            <Badge tone="blue">{COLUMNS.find((c) => c.key === openCandidate.stage)?.label}</Badge>
            <div className="text-sm text-text-secondary">
              <div>Origem: {openCandidate.origem ?? '—'}</div>
              <div>E-mail: {openCandidate.email ?? '—'}</div>
              <div>Telefone: {openCandidate.telefone ?? '—'}</div>
            </div>
            <div className="text-sm">
              <div className="mb-1 font-semibold">Scorecard</div>
              <div className="text-text-secondary">
                Comunicação {openCandidate.scoreComunicacao}/5 · Técnica {openCandidate.scoreTecnica}/5 · Cultura{' '}
                {openCandidate.scoreCultura}/5
              </div>
            </div>
            {openCandidate.stage !== 'CONTRATADO' && openCandidate.stage !== 'REPROVADO' && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => advance.mutate(openCandidate.id)} disabled={advance.isPending}>
                  Avançar etapa
                </Button>
                <Button variant="secondary" onClick={() => talentBank.mutate(openCandidate.id)}>
                  Mover para banco de talentos
                </Button>
                <Button variant="secondary" onClick={() => reject.mutate(openCandidate.id)}>
                  Reprovar
                </Button>
                <Button variant="danger" onClick={() => block.mutate(openCandidate.id)}>
                  Bloquear candidato
                </Button>
              </div>
            )}
            {openCandidate.stage === 'CONTRATADO' && (
              <p className="text-sm text-success">
                Contratado — registro de admissão criado automaticamente em Admissão.
              </p>
            )}
          </div>
        )}
      </Drawer>

      {job.costs.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Custos da vaga</h3>
          <Card>
            <table className="w-full text-sm">
              <tbody>
                {job.costs.map((c) => (
                  <tr key={c.id} className="border-b border-divider last:border-0">
                    <td className="py-2">{c.categoria}</td>
                    <td className="py-2 text-text-secondary">{c.descricao}</td>
                    <td className="py-2 text-right font-medium">{formatBRL(Number(c.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
