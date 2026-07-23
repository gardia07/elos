'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card, KpiCard } from '@/components/ui';

interface DocRow {
  id: string;
  status: 'MISSING' | 'PENDING' | 'COMPLIANT' | 'EXPIRED' | 'REJECTED';
  expiraEm: string | null;
  requirement: { nome: string; categoria: string };
  employee: { nome: string };
}

interface AllDocuments {
  counts: Record<DocRow['status'], number>;
  documentos: DocRow[];
}

const STATUS_LABEL = { MISSING: 'Faltante', PENDING: 'Em análise', COMPLIANT: 'Conforme', EXPIRED: 'Vencido', REJECTED: 'Não conforme' } as const;
const STATUS_TONE = { MISSING: 'grey', PENDING: 'blue', COMPLIANT: 'green', EXPIRED: 'red', REJECTED: 'red' } as const;

export default function DocumentosGeralPage() {
  const { data } = useQuery({
    queryKey: ['rh', 'documents', 'all-employees'],
    queryFn: async () => (await api.get<AllDocuments>('/rh/documents/all-employees')).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Faltantes" value={data?.counts.MISSING ?? '—'} />
        <KpiCard label="Em análise" value={data?.counts.PENDING ?? '—'} />
        <KpiCard label="Vencidos" value={data?.counts.EXPIRED ?? '—'} />
        <KpiCard label="Não conformes" value={data?.counts.REJECTED ?? '—'} />
        <KpiCard label="Conformes" value={data?.counts.COMPLIANT ?? '—'} />
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Vencimento</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.documentos.map((d) => (
              <tr key={d.id} className="border-b border-divider last:border-0">
                <td className="px-5 py-3 font-medium">{d.requirement.nome}</td>
                <td className="px-5 py-3">{d.employee.nome}</td>
                <td className="px-5 py-3 text-text-secondary">{d.requirement.categoria}</td>
                <td className="px-5 py-3 text-text-secondary">{d.expiraEm ? new Date(d.expiraEm).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.documentos.length === 0 && (
          <p className="py-8 text-center text-sm text-text-tertiary">
            Nenhum documento obrigatório configurado ainda — configure em Gestão de Pessoas &gt; Colaboradores &gt; Documentos obrigatórios.
          </p>
        )}
      </Card>
    </div>
  );
}
