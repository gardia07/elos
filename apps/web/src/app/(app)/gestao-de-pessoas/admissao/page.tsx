'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';

interface Admission {
  id: string;
  nome: string;
  cargo: string;
  filial: string;
  dataInicio: string;
  status: 'PENDENTE_DOCUMENTO' | 'AGUARDANDO_EXAME' | 'PRONTO_PARA_EFETIVAR' | 'EFETIVADO';
}

const STATUS_TONE = {
  PENDENTE_DOCUMENTO: 'red',
  AGUARDANDO_EXAME: 'amber',
  PRONTO_PARA_EFETIVAR: 'blue',
  EFETIVADO: 'green',
} as const;

const STATUS_LABEL = {
  PENDENTE_DOCUMENTO: 'Pendente documento',
  AGUARDANDO_EXAME: 'Aguardando exame',
  PRONTO_PARA_EFETIVAR: 'Pronto para efetivar',
  EFETIVADO: 'Efetivado',
} as const;

export default function AdmissaoPage() {
  const { data: admissions, isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: async () => (await api.get<Admission[]>('/rh/admissions')).data,
  });

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-text-tertiary">Carregando…</p>}
      {admissions?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma admissão em andamento.</p>}
      <div className="flex flex-col gap-3">
        {admissions?.map((a) => (
          <Link key={a.id} href={`/gestao-de-pessoas/admissao/${a.id}`}>
            <Card className="flex items-center justify-between hover:border-accent">
              <div>
                <div className="font-medium">{a.nome}</div>
                <div className="text-sm text-text-secondary">
                  {a.cargo} · {a.filial} · início {new Date(a.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </div>
              </div>
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
