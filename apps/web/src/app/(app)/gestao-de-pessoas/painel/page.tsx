'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, EmptyState, KpiCard } from '@/components/ui';

interface Cards {
  colaboradoresAtivos: number;
  admissoesNoMes: number;
  desligamentosNoMes: number;
  emFerias: number;
  emAfastamento: number;
  processosDesligamentoAbertos: number;
  pendenciasCriticasDp: number;
  pendenciasCriticasDpDetalhe: { documentosVencidos: number; examesPendentes: number };
}

interface GroupItem {
  label: string;
  total: number;
  percentual: number;
}

interface Painel {
  cards: Cards;
  admissoesDesligamentosPorMes: { mes: string; admissoes: number; desligamentos: number }[];
  turnoverPorMes: { mes: string; percentual: number }[];
  porDepartamento: GroupItem[];
  porFilial: GroupItem[];
  porGenero: GroupItem[];
  porFaixaEtaria: GroupItem[];
  porEscolaridade: GroupItem[];
  tempoDeCasa: { mediaMeses: number; porFaixa: GroupItem[] };
  absenteismo: { disponivel: boolean; porMes: { mes: string; percentual: number }[] };
}

function formatMes(mes: string): string {
  const [year, month] = mes.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long' });
}

function formatTempoDeCasa(meses: number): string {
  const totalMeses = Math.round(meses);
  const anos = Math.floor(totalMeses / 12);
  const mesesRestantes = totalMeses % 12;
  const anoTxt = anos === 1 ? '1 ano' : `${anos} anos`;
  const mesTxt = mesesRestantes === 1 ? '1 mês' : `${mesesRestantes} meses`;
  if (anos === 0) return mesTxt;
  if (mesesRestantes === 0) return anoTxt;
  return `${anoTxt} e ${mesTxt}`;
}

function DistribuicaoList({ items }: { items: GroupItem[] | undefined }) {
  if (!items || items.length === 0) return <EmptyState>Sem dados suficientes.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-text">{item.label}</span>
            <span className="font-medium text-text">
              {item.total} <span className="text-text-tertiary">({item.percentual}%)</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, item.percentual)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyBarChart({
  data,
  formatValue = (v: number) => String(v),
}: {
  data: { mes: string; valor: number }[] | undefined;
  formatValue?: (v: number) => string;
}) {
  if (!data || data.length === 0) return <EmptyState>Sem dados suficientes.</EmptyState>;
  const max = Math.max(1, ...data.map((d) => d.valor));
  return (
    <div className="flex items-end gap-2" style={{ height: 140 }}>
      {data.map((d) => (
        <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-text-secondary">{formatValue(d.valor)}</span>
          <div
            className="w-full rounded-t-[6px] bg-accent"
            style={{ height: `${Math.max(4, (d.valor / max) * 100)}px` }}
          />
          <span className="text-[10px] capitalize text-text-tertiary">{formatMes(d.mes)}</span>
        </div>
      ))}
    </div>
  );
}

export default function GestaoDePessoasPainelPage() {
  const { data } = useQuery({
    queryKey: ['rh', 'painel'],
    queryFn: async () => (await api.get<Painel>('/rh/painel')).data,
  });

  const cards = data?.cards;

  const admDesligMax = Math.max(
    1,
    ...(data?.admissoesDesligamentosPorMes ?? []).flatMap((d) => [d.admissoes, d.desligamentos]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-7 gap-3">
        <KpiCard label="Colaboradores ativos" value={cards?.colaboradoresAtivos ?? '—'} />
        <KpiCard label="Admissões no mês" value={cards?.admissoesNoMes ?? '—'} />
        <KpiCard label="Desligamentos no mês" value={cards?.desligamentosNoMes ?? '—'} />
        <KpiCard label="Em férias" value={cards?.emFerias ?? '—'} />
        <KpiCard label="Em afastamento" value={cards?.emAfastamento ?? '—'} />
        <KpiCard label="Processos de desligamento em aberto" value={cards?.processosDesligamentoAbertos ?? '—'} />
        <KpiCard
          label="Pendências críticas de DP"
          value={cards?.pendenciasCriticasDp ?? '—'}
          delta={
            cards && (
              <span className="text-text-tertiary">
                {cards.pendenciasCriticasDpDetalhe.documentosVencidos} documento(s) vencido(s) ·{' '}
                {cards.pendenciasCriticasDpDetalhe.examesPendentes} exame(s) pendente(s)
              </span>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Admissões x Desligamentos por mês</h3>
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> Admissões
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" /> Desligamentos
              </span>
            </div>
          </div>
          {data?.admissoesDesligamentosPorMes && data.admissoesDesligamentosPorMes.length > 0 ? (
            <div className="flex items-end gap-2" style={{ height: 140 }}>
              {data.admissoesDesligamentosPorMes.map((d) => (
                <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center gap-1" style={{ height: 110 }}>
                    <div className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-medium text-text-secondary">{d.admissoes || ''}</span>
                      <div
                        className="w-full rounded-t-[4px] bg-success"
                        style={{ height: `${Math.max(d.admissoes ? 4 : 0, (d.admissoes / admDesligMax) * 100)}px` }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-medium text-text-secondary">{d.desligamentos || ''}</span>
                      <div
                        className="w-full rounded-t-[4px] bg-danger"
                        style={{ height: `${Math.max(d.desligamentos ? 4 : 0, (d.desligamentos / admDesligMax) * 100)}px` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] capitalize text-text-tertiary">{formatMes(d.mes)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Sem dados suficientes.</EmptyState>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Turnover (rotatividade) mensal</h3>
          <MonthlyBarChart
            data={data?.turnoverPorMes.map((t) => ({ mes: t.mes, valor: t.percentual }))}
            formatValue={(v) => `${v}%`}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Colaboradores por departamento</h3>
          <DistribuicaoList items={data?.porDepartamento} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Colaboradores por filial/empresa</h3>
          <DistribuicaoList items={data?.porFilial} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Distribuição por gênero</h3>
          <DistribuicaoList items={data?.porGenero} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Distribuição por faixa etária</h3>
          <DistribuicaoList items={data?.porFaixaEtaria} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Distribuição por escolaridade</h3>
          <DistribuicaoList items={data?.porEscolaridade} />
        </Card>

        <Card>
          <h3 className="mb-1 text-sm font-semibold">Tempo médio de casa</h3>
          {data?.tempoDeCasa && data.tempoDeCasa.porFaixa.length > 0 ? (
            <>
              <div className="mb-4 text-[28px] font-semibold text-text">
                {formatTempoDeCasa(data.tempoDeCasa.mediaMeses)}
              </div>
              <DistribuicaoList items={data.tempoDeCasa.porFaixa} />
            </>
          ) : (
            <EmptyState>Sem dados suficientes.</EmptyState>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-1 text-sm font-semibold">Taxa de absenteísmo mensal</h3>
        {data?.absenteismo.disponivel ? (
          <>
            <p className="mb-3 text-xs text-text-tertiary">
              Estimativa a partir das ocorrências de ponto registradas como falta — não substitui um relatório
              completo de REP-P.
            </p>
            <MonthlyBarChart
              data={data.absenteismo.porMes.map((a) => ({ mes: a.mes, valor: a.percentual }))}
              formatValue={(v) => `${v}%`}
            />
          </>
        ) : (
          <EmptyState>
            Sem dados de ponto/REP-P suficientes para calcular a taxa de absenteísmo ainda.
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
