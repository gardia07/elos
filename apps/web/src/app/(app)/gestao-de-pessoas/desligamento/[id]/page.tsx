'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
  bloqueante: boolean;
}

interface Readiness {
  ready: boolean;
  pendingBlocking: string[];
  pendingInfo: string[];
}

interface TerminationDetail {
  id: string;
  nome: string;
  cargo: string;
  tipo: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO';
  status: 'EM_ANDAMENTO' | 'CONCLUIDO';
  docs: Record<string, boolean>;
  esocialSent: boolean;
  termoGerado: boolean;
  cartaGerada: boolean;
  entrevistaMotivo: string | null;
  entrevistaObs: string | null;
  checklist: ChecklistItem[];
  readiness: Readiness;
}

export default function TerminationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [termoText, setTermoText] = useState('');
  const [cartaText, setCartaText] = useState('');
  const [entrevistaMotivo, setEntrevistaMotivo] = useState('');
  const [entrevistaObs, setEntrevistaObs] = useState('');

  const { data: t } = useQuery({
    queryKey: ['termination', id],
    queryFn: async () => (await api.get<TerminationDetail>(`/rh/terminations/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (!t) return;
    setEntrevistaMotivo(t.entrevistaMotivo ?? '');
    setEntrevistaObs(t.entrevistaObs ?? '');
  }, [t]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['termination', id] });

  const toggleDoc = useMutation({
    mutationFn: async (vars: { key: string; checked: boolean }) => api.patch(`/rh/terminations/${id}/docs`, vars),
    onSuccess: invalidate,
  });
  const sendEsocial = useMutation({
    mutationFn: async () => api.post(`/rh/terminations/${id}/esocial`),
    onSuccess: invalidate,
  });
  const generateTermo = useMutation({
    mutationFn: async () => (await api.post(`/rh/terminations/${id}/generate-termo`)).data,
    onSuccess: (data: { texto: string }) => {
      setTermoText(data.texto);
      invalidate();
    },
  });
  const generateCarta = useMutation({
    mutationFn: async () => (await api.post(`/rh/terminations/${id}/generate-carta`)).data,
    onSuccess: (data: { texto: string }) => {
      setCartaText(data.texto);
      invalidate();
    },
  });
  const updateStatus = useMutation({
    mutationFn: async (status: 'EM_ANDAMENTO' | 'CONCLUIDO') => api.patch(`/rh/terminations/${id}/status`, { status }),
    onSuccess: invalidate,
  });
  const saveInterview = useMutation({
    mutationFn: async () => api.patch(`/rh/terminations/${id}/exit-interview`, { entrevistaMotivo, entrevistaObs }),
    onSuccess: invalidate,
  });

  if (!t) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/gestao-de-pessoas/desligamento" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Desligamento
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.nome}</h2>
          <p className="text-sm text-text-secondary">{t.cargo}</p>
        </div>
        <Badge tone={t.status === 'CONCLUIDO' ? 'green' : 'amber'}>
          {t.status === 'CONCLUIDO' ? 'Concluído' : 'Em andamento'}
        </Badge>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Checklist</h3>
        <div className="flex flex-col gap-2">
          {t.checklist.filter((c) => c.ativo).map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!t.docs[c.key]}
                onChange={(e) => toggleDoc.mutate({ key: c.key, checked: e.target.checked })}
              />
              {c.nome}
              {c.bloqueante ? (
                <Badge tone="red">bloqueia conclusão</Badge>
              ) : (
                <Badge tone="grey">informativo</Badge>
              )}
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Evento eSocial S-2299</span>
          {t.esocialSent ? <Badge tone="green">Enviado</Badge> : <Button onClick={() => sendEsocial.mutate()}>Enviar</Button>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Termo de rescisão</span>
          <Button variant="secondary" onClick={() => generateTermo.mutate()}>
            {t.termoGerado ? 'Ver termo' : 'Gerar termo'}
          </Button>
        </div>
        {termoText && <p className="rounded-[10px] bg-surface-alt p-3 text-xs text-text-secondary">{termoText}</p>}
        <div className="flex items-center justify-between">
          <span className="text-sm">Carta de referência</span>
          <Button variant="secondary" onClick={() => generateCarta.mutate()}>
            {t.cartaGerada ? 'Ver carta' : 'Gerar carta'}
          </Button>
        </div>
        {cartaText && <p className="rounded-[10px] bg-surface-alt p-3 text-xs text-text-secondary">{cartaText}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Entrevista de desligamento</h3>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Motivo relatado</span>
          <input
            value={entrevistaMotivo}
            onChange={(e) => setEntrevistaMotivo(e.target.value)}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Observações</span>
          <textarea
            value={entrevistaObs}
            onChange={(e) => setEntrevistaObs(e.target.value)}
            rows={3}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <Button variant="secondary" onClick={() => saveInterview.mutate()} className="self-start">
          Salvar
        </Button>
      </Card>

      {t.status === 'EM_ANDAMENTO' ? (
        <div className="flex flex-col items-start gap-2">
          <Button disabled={!t.readiness.ready} onClick={() => updateStatus.mutate('CONCLUIDO')}>
            Marcar como concluído
          </Button>
          {!t.readiness.ready && (
            <p className="text-xs text-text-tertiary">
              Pendente(s) bloqueando conclusão: {t.readiness.pendingBlocking.join(', ')}
            </p>
          )}
        </div>
      ) : (
        <Button variant="secondary" onClick={() => updateStatus.mutate('EM_ANDAMENTO')}>
          Reabrir
        </Button>
      )}
    </div>
  );
}
