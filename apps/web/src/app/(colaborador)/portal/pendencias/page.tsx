'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

type StatusPendencia = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_ASSINATURA' | 'CONCLUIDA' | 'VENCIDA' | 'DESCARTADA';

interface PendenciaRow {
  id: string;
  status: StatusPendencia;
  dataLimite: string;
  dataConclusao: string | null;
  documento: { nome: string };
  regra: { bloqueante: boolean; baseLegal: string | null };
}

const STATUS_LABEL: Record<StatusPendencia, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_ASSINATURA: 'Aguardando sua assinatura',
  CONCLUIDA: 'Concluída',
  VENCIDA: 'Vencida',
  DESCARTADA: 'Descartada (não se aplicava)',
};

const STATUS_TONE: Record<StatusPendencia, 'grey' | 'blue' | 'amber' | 'green' | 'red'> = {
  ABERTA: 'grey',
  EM_ANDAMENTO: 'blue',
  AGUARDANDO_ASSINATURA: 'amber',
  CONCLUIDA: 'green',
  VENCIDA: 'red',
  DESCARTADA: 'grey',
};

const ENCERRADA: StatusPendencia[] = ['CONCLUIDA', 'DESCARTADA'];

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || 'Não foi possível validar o documento.';
}

function AnexarDocumento({ pendenciaId }: { pendenciaId: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const enviar = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('arquivo', file);
      return (await api.post<{ motivo: string }>(`/portal/pendencias/${pendenciaId}/anexar`, form)).data;
    },
    onSuccess: (data) => {
      setErro(null);
      setSucesso(data.motivo || 'Documento validado e pendência resolvida.');
      queryClient.invalidateQueries({ queryKey: ['portal', 'pendencias'] });
    },
    onError: (err: unknown) => {
      setSucesso(null);
      setErro(extractErrorMessage(err));
    },
  });

  if (sucesso) return <p className="text-xs text-success">{sucesso}</p>;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="w-40 text-xs text-text-secondary file:mr-2 file:rounded-control file:border file:border-border-strong file:bg-surface file:px-2 file:py-1 file:text-xs"
          onChange={() => setErro(null)}
        />
        <Button
          variant="secondary"
          onClick={() => {
            const file = inputRef.current?.files?.[0];
            if (file) enviar.mutate(file);
          }}
          disabled={enviar.isPending}
        >
          {enviar.isPending ? 'Validando…' : 'Enviar'}
        </Button>
      </div>
      {erro && <p className="max-w-xs text-xs text-danger">{erro}</p>}
    </div>
  );
}

export default function PortalPendenciasPage() {
  const { data } = useQuery({
    queryKey: ['portal', 'pendencias'],
    queryFn: async () => (await api.get<PendenciaRow[]>('/portal/pendencias')).data,
    retry: false,
  });

  const pendentes = data?.filter((p) => !ENCERRADA.includes(p.status)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Suas pendências de conformidade</h3>
        <Badge tone={pendentes.length === 0 ? 'green' : 'amber'}>{pendentes.length} em aberto</Badge>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Documento exigido</th>
              <th className="px-5 py-3 font-medium">Prazo</th>
              <th className="px-5 py-3 font-medium">Base legal</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Anexar</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">
                  {p.documento.nome}
                  {p.regra.bloqueante && !ENCERRADA.includes(p.status) && (
                    <div className="text-xs text-danger">Bloqueia seu cadastro até ser resolvida</div>
                  )}
                </td>
                <td className="px-5 py-3 text-text-secondary">{new Date(p.dataLimite).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3 text-text-secondary">{p.regra.baseLegal ?? '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="px-5 py-3">{!ENCERRADA.includes(p.status) && <AnexarDocumento pendenciaId={p.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma pendência registrada para você.</p>}
      </Card>
    </div>
  );
}
