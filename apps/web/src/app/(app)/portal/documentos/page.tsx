'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';

interface DocRow {
  id: string;
  status: 'MISSING' | 'PENDING' | 'COMPLIANT' | 'EXPIRED' | 'REJECTED';
  expiraEm: string | null;
  requirement: { nome: string; categoria: string; obrigatorio: boolean };
}

const STATUS_LABEL = { MISSING: 'Faltante', PENDING: 'Em análise', COMPLIANT: 'Conforme', EXPIRED: 'Vencido', REJECTED: 'Não conforme' } as const;
const STATUS_TONE = { MISSING: 'grey', PENDING: 'blue', COMPLIANT: 'green', EXPIRED: 'red', REJECTED: 'red' } as const;

export default function PortalDocumentosPage() {
  const { data } = useQuery({
    queryKey: ['portal', 'documentos'],
    queryFn: async () => (await api.get<{ compliance: number; documentos: DocRow[] }>('/portal/documentos')).data,
    retry: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Conformidade documental</h3>
        <Badge tone={(data?.compliance ?? 0) >= 90 ? 'green' : (data?.compliance ?? 0) >= 50 ? 'amber' : 'red'}>{data?.compliance ?? 0}%</Badge>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Vencimento</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.documentos.map((d) => (
              <tr key={d.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{d.requirement.nome}</td>
                <td className="px-5 py-3 text-text-secondary">{d.requirement.categoria}</td>
                <td className="px-5 py-3 text-text-secondary">{d.expiraEm ? new Date(d.expiraEm).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.documentos.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum documento obrigatório para você no momento.</p>}
      </Card>
    </div>
  );
}
