'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';

interface Payslip {
  id: string;
  proventos: string;
  descontos: string;
  liquido: string;
  payrollRun: { competencia: string; status: 'ABERTO' | 'PROCESSADA' };
}

export default function PortalHoleritesPage() {
  const { data } = useQuery({
    queryKey: ['portal', 'holerites'],
    queryFn: async () => (await api.get<Payslip[]>('/portal/holerites')).data,
    retry: false,
  });

  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider text-left text-text-tertiary">
            <th className="px-5 py-3 font-medium">Competência</th>
            <th className="px-5 py-3 font-medium">Proventos</th>
            <th className="px-5 py-3 font-medium">Descontos</th>
            <th className="px-5 py-3 font-medium">Líquido</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id} className="border-b border-divider last:border-0">
              <td className="px-5 py-3 font-medium">{p.payrollRun.competencia}</td>
              <td className="px-5 py-3 text-text-secondary">R$ {Number(p.proventos).toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3 text-text-secondary">R$ {Number(p.descontos).toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3 font-medium">R$ {Number(p.liquido).toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3">
                <Badge tone={p.payrollRun.status === 'PROCESSADA' ? 'green' : 'amber'}>
                  {p.payrollRun.status === 'PROCESSADA' ? 'Processada' : 'Em aberto'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum holerite disponível ainda.</p>}
    </Card>
  );
}
