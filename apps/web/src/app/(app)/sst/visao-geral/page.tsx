'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card, KpiCard } from '@/components/ui';

interface AccidentKpis {
  comAfastamento: number;
  taxaGravidade: number;
  pendentesEsocial: number;
  totalMes: number;
}
interface ExamKpis {
  emDiaPct: number;
}
interface NrKpis {
  vencendo: number;
  vencidos: number;
}
interface PgrAction {
  id: string;
  acao: string;
  setor: string;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  atrasada: boolean;
}
interface PcmsoUpcoming {
  nome: string;
  tipo: string;
  diasRestantes: number;
}

const STATUS_LABEL = { PLANEJADA: 'Planejada', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída' } as const;

export default function SstVisaoGeralPage() {
  const { data: accidentKpis } = useQuery({
    queryKey: ['sst', 'accidents', 'kpis'],
    queryFn: async () => (await api.get<AccidentKpis>('/sst/accidents/kpis')).data,
  });
  const { data: examKpis } = useQuery({
    queryKey: ['sst', 'exams', 'kpis'],
    queryFn: async () => (await api.get<ExamKpis>('/sst/exams/kpis')).data,
  });
  const { data: nrKpis } = useQuery({
    queryKey: ['sst', 'nr-trainings', 'kpis'],
    queryFn: async () => (await api.get<NrKpis>('/sst/nr-trainings/kpis')).data,
  });
  const { data: pgrActions } = useQuery({
    queryKey: ['sst', 'pgr', 'actions'],
    queryFn: async () => (await api.get<PgrAction[]>('/sst/pgr/actions')).data,
  });
  const { data: pcmso } = useQuery({
    queryKey: ['sst', 'pgr', 'pcmso-upcoming'],
    queryFn: async () => (await api.get<PcmsoUpcoming[]>('/sst/pgr/pcmso-upcoming')).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Acidentes no mês (c/ afastamento)" value={accidentKpis?.comAfastamento ?? '—'} />
        <KpiCard label="Taxa de gravidade" value={accidentKpis?.taxaGravidade ?? '—'} />
        <KpiCard label="Exames em dia" value={examKpis ? `${examKpis.emDiaPct}%` : '—'} />
        <KpiCard label="Treinamentos NR vencendo" value={nrKpis?.vencendo ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">PCMSO — exames a vencer</h3>
          <ul className="flex flex-col gap-2">
            {pcmso?.map((e, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>
                  {e.nome} — {e.tipo}
                </span>
                <span className="text-danger">{e.diasRestantes < 0 ? 'atrasado' : `em ${e.diasRestantes} dias`}</span>
              </li>
            ))}
            {pcmso?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum exame vencendo.</p>}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">PGR — ações corretivas</h3>
          <ul className="flex flex-col gap-2">
            {pgrActions?.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>
                  {a.acao} — {a.setor}
                </span>
                <Badge tone={a.atrasada ? 'red' : a.status === 'CONCLUIDA' ? 'green' : 'amber'}>
                  {a.atrasada ? 'Atrasada' : STATUS_LABEL[a.status]}
                </Badge>
              </li>
            ))}
            {pgrActions?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma ação cadastrada.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
