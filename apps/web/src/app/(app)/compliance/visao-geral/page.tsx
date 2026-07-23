'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card, KpiCard } from '@/components/ui';

interface Overview {
  maturidade: number;
  casosAbertos: number;
  casosConcluidosMes: number;
  politicasAtivas: number;
  coberturaMediaPoliticas: number;
}

export default function ComplianceVisaoGeralPage() {
  const { data } = useQuery({
    queryKey: ['compliance', 'overview'],
    queryFn: async () => (await api.get<Overview>('/compliance/overview')).data,
  });

  const tone = (v: number | undefined) => ((v ?? 0) >= 80 ? 'green' : (v ?? 0) >= 50 ? 'amber' : 'red');

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Maturidade geral de compliance
          </div>
          <div className="text-[32px] font-semibold text-text">{data?.maturidade ?? '—'}/100</div>
        </div>
        <Badge tone={tone(data?.maturidade)}>
          {(data?.maturidade ?? 0) >= 80 ? 'Maduro' : (data?.maturidade ?? 0) >= 50 ? 'Em desenvolvimento' : 'Atenção'}
        </Badge>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Casos de ética em aberto" value={data?.casosAbertos ?? '—'} />
        <KpiCard label="Casos concluídos no mês" value={data?.casosConcluidosMes ?? '—'} />
        <KpiCard label="Políticas ativas" value={data?.politicasAtivas ?? '—'} />
        <KpiCard label="Cobertura média de aceite" value={data ? `${data.coberturaMediaPoliticas}%` : '—'} />
      </div>
    </div>
  );
}
