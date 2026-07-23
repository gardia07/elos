'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui';
import { Header } from '@/components/header';

interface HeadcountPoint {
  mes: string;
  total: number;
}
interface CustoContratacao {
  custoMedio: number;
  vagasComCusto: number;
}
interface Turnover {
  geral: number;
  porDepartamento: { departamento: string; percentual: number; saidas: number }[];
}
interface Diversidade {
  porGenero: { label: string; total: number; percentual: number }[];
  porRacaCor: { label: string; total: number; percentual: number }[];
  pcdPercentual: number;
  liderancaConfigurada: boolean;
  mulheresLiderancaPercentual: number | null;
}

function formatMes(mes: string): string {
  const [year, month] = mes.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export default function IndicadoresPage() {
  const { data: headcount } = useQuery({
    queryKey: ['indicadores', 'headcount'],
    queryFn: async () => (await api.get<HeadcountPoint[]>('/indicadores/headcount')).data,
  });
  const { data: custo } = useQuery({
    queryKey: ['indicadores', 'custo'],
    queryFn: async () => (await api.get<CustoContratacao>('/indicadores/custo-contratacao')).data,
  });
  const { data: turnover } = useQuery({
    queryKey: ['indicadores', 'turnover'],
    queryFn: async () => (await api.get<Turnover>('/indicadores/turnover')).data,
  });
  const { data: diversidade } = useQuery({
    queryKey: ['indicadores', 'diversidade'],
    queryFn: async () => (await api.get<Diversidade>('/indicadores/diversidade')).data,
  });

  const maxHeadcount = Math.max(1, ...(headcount?.map((h) => h.total) ?? [1]));

  return (
    <>
      <Header eyebrow="Cross-hub analytics" title="Indicadores" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Evolução do headcount</h3>
              <div className="flex items-end gap-3" style={{ height: 140 }}>
                {headcount?.map((h) => (
                  <div key={h.mes} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium text-text-secondary">{h.total}</span>
                    <div
                      className="w-full rounded-t-[6px] bg-accent"
                      style={{ height: `${Math.max(6, (h.total / maxHeadcount) * 100)}px` }}
                    />
                    <span className="text-[10px] capitalize text-text-tertiary">{formatMes(h.mes)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="mb-1 text-sm font-semibold">Custo médio por contratação</h3>
              <div className="text-[28px] font-semibold text-text">
                {custo ? `R$ ${custo.custoMedio.toLocaleString('pt-BR')}` : '—'}
              </div>
              <p className="mb-4 text-xs text-text-tertiary">Baseado em {custo?.vagasComCusto ?? 0} vaga(s) com custos registrados.</p>

              <h4 className="mb-2 text-sm font-semibold">Diversidade</h4>
              <ul className="flex flex-col gap-1.5 text-sm">
                {diversidade?.porGenero.map((g) => (
                  <li key={g.label} className="flex justify-between">
                    <span className="text-text-secondary">{g.label}</span>
                    <span className="font-medium">{g.percentual}%</span>
                  </li>
                ))}
                <li className="flex justify-between">
                  <span className="text-text-secondary">PCD no quadro</span>
                  <span className="font-medium">{diversidade?.pcdPercentual ?? 0}%</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-secondary">Mulheres em liderança</span>
                  <span className="font-medium">
                    {diversidade?.liderancaConfigurada ? `${diversidade.mulheresLiderancaPercentual}%` : 'configure cargos de liderança em DP'}
                  </span>
                </li>
              </ul>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Turnover por departamento</h3>
              <span className="text-sm text-text-secondary">Geral (3 meses): <strong>{turnover?.geral ?? 0}%</strong></span>
            </div>
            <div className="flex flex-col gap-3">
              {turnover?.porDepartamento.map((d) => (
                <div key={d.departamento}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{d.departamento}</span>
                    <span className="font-medium">{d.percentual}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, d.percentual)}%` }} />
                  </div>
                </div>
              ))}
              {turnover?.porDepartamento.length === 0 && <p className="text-sm text-text-tertiary">Sem dados suficientes.</p>}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
