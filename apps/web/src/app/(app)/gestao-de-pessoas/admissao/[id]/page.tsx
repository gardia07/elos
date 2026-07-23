'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
}

interface AdmissionDetail {
  id: string;
  nome: string;
  cargo: string;
  filial: string;
  status: 'PENDENTE_DOCUMENTO' | 'AGUARDANDO_EXAME' | 'PRONTO_PARA_EFETIVAR' | 'EFETIVADO';
  origemVaga: string | null;
  docs: Record<string, boolean>;
  esocialSent: boolean;
  contratoGerado: boolean;
  contratoAssinado: boolean;
  checklist: ChecklistItem[];
  auditLog: { id: string; action: string; createdAt: string; payload: unknown }[];
}

export default function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: adm } = useQuery({
    queryKey: ['admission', id],
    queryFn: async () => (await api.get<AdmissionDetail>(`/rh/admissions/${id}`)).data,
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admission', id] });

  const toggleDoc = useMutation({
    mutationFn: async (vars: { key: string; checked: boolean }) => api.patch(`/rh/admissions/${id}/docs`, vars),
    onSuccess: invalidate,
  });
  const sendEsocial = useMutation({
    mutationFn: async () => api.post(`/rh/admissions/${id}/esocial`),
    onSuccess: invalidate,
  });
  const generateContract = useMutation({
    mutationFn: async () => api.post(`/rh/admissions/${id}/contract`),
    onSuccess: invalidate,
  });
  const signContract = useMutation({
    mutationFn: async () => api.post(`/rh/admissions/${id}/sign`),
    onSuccess: invalidate,
  });
  const efetivar = useMutation({
    mutationFn: async () => api.post(`/rh/admissions/${id}/efetivar`),
    onSuccess: () => {
      invalidate();
      router.push('/gestao-de-pessoas/colaboradores');
    },
  });

  if (!adm) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  const checklistComplete = adm.checklist.every((c) => adm.docs[c.key]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/gestao-de-pessoas/admissao" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Admissão
      </Link>

      <div>
        <h2 className="text-lg font-semibold">{adm.nome}</h2>
        <p className="text-sm text-text-secondary">
          {adm.cargo} · {adm.filial}
        </p>
        {adm.origemVaga && <p className="mt-1 text-xs text-text-tertiary">{adm.origemVaga}</p>}
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Checklist de documentos</h3>
        <div className="flex flex-col gap-2">
          {adm.checklist.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!adm.docs[c.key]}
                disabled={adm.status === 'EFETIVADO'}
                onChange={(e) => toggleDoc.mutate({ key: c.key, checked: e.target.checked })}
              />
              {c.nome}
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Esteira de efetivação</h3>

        <GateRow
          label="1. Checklist de documentos completo"
          done={checklistComplete}
        />
        <GateRow label="2. Evento eSocial S-2200" done={adm.esocialSent}>
          {!adm.esocialSent && (
            <Button disabled={!checklistComplete || sendEsocial.isPending} onClick={() => sendEsocial.mutate()}>
              Enviar eSocial
            </Button>
          )}
        </GateRow>
        <GateRow label="3. Contrato gerado" done={adm.contratoGerado}>
          {!adm.contratoGerado && (
            <Button disabled={!adm.esocialSent || generateContract.isPending} onClick={() => generateContract.mutate()}>
              Gerar contrato
            </Button>
          )}
        </GateRow>
        <GateRow label="4. Contrato assinado" done={adm.contratoAssinado}>
          {adm.contratoGerado && !adm.contratoAssinado && (
            <Button disabled={signContract.isPending} onClick={() => signContract.mutate()}>
              Assinar contrato
            </Button>
          )}
        </GateRow>

        <div className="mt-2 border-t border-divider pt-3">
          {adm.status === 'EFETIVADO' ? (
            <Badge tone="green">Admissão efetivada</Badge>
          ) : (
            <Button
              disabled={!checklistComplete || !adm.esocialSent || !adm.contratoAssinado || efetivar.isPending}
              onClick={() => efetivar.mutate()}
            >
              Efetivar admissão
            </Button>
          )}
        </div>
      </Card>

      {adm.auditLog.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-secondary">Trilha de auditoria</h3>
          <ul className="flex flex-col gap-1 text-xs text-text-tertiary">
            {adm.auditLog.map((e) => (
              <li key={e.id}>
                {new Date(e.createdAt).toLocaleString('pt-BR')} — {e.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GateRow({ label, done, children }: { label: string; done: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${done ? 'text-success' : 'text-text-secondary'}`}>
        {done ? '✓ ' : ''}
        {label}
      </span>
      {children}
    </div>
  );
}
