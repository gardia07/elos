'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';

interface PendenciaRow {
  id: string;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_ASSINATURA' | 'CONCLUIDA' | 'VENCIDA';
  dataLimite: string;
  dataConclusao: string | null;
  documento: { nome: string };
  regra: { bloqueante: boolean; baseLegal: string | null };
}

const STATUS_LABEL: Record<PendenciaRow['status'], string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_ASSINATURA: 'Aguardando sua assinatura',
  CONCLUIDA: 'Concluída',
  VENCIDA: 'Vencida',
};

const STATUS_TONE: Record<PendenciaRow['status'], 'grey' | 'blue' | 'amber' | 'green' | 'red'> = {
  ABERTA: 'grey',
  EM_ANDAMENTO: 'blue',
  AGUARDANDO_ASSINATURA: 'amber',
  CONCLUIDA: 'green',
  VENCIDA: 'red',
};

export default function PortalPendenciasPage() {
  const { data } = useQuery({
    queryKey: ['portal', 'pendencias'],
    queryFn: async () => (await api.get<PendenciaRow[]>('/portal/pendencias')).data,
    retry: false,
  });

  const pendentes = data?.filter((p) => p.status !== 'CONCLUIDA') ?? [];

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
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">
                  {p.documento.nome}
                  {p.regra.bloqueante && p.status !== 'CONCLUIDA' && (
                    <div className="text-xs text-danger">Bloqueia seu cadastro até ser resolvida</div>
                  )}
                </td>
                <td className="px-5 py-3 text-text-secondary">{new Date(p.dataLimite).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3 text-text-secondary">{p.regra.baseLegal ?? '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma pendência registrada para você.</p>}
      </Card>
    </div>
  );
}
