'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui';

interface Historico {
  id: string;
  evento: string;
  categoria: string;
  autor: string;
  data: string;
}

export default function PortalHistoricoPage() {
  const { data } = useQuery({
    queryKey: ['portal', 'historico'],
    queryFn: async () => (await api.get<Historico[]>('/portal/historico')).data,
    retry: false,
  });

  return (
    <Card>
      <ul className="flex flex-col gap-3">
        {data?.map((h) => (
          <li key={h.id} className="flex items-start justify-between border-b border-divider pb-3 text-sm last:border-0 last:pb-0">
            <div>
              <div className="font-medium">{h.evento}</div>
              <div className="text-xs text-text-tertiary">{h.categoria} · {h.autor}</div>
            </div>
            <span className="text-xs text-text-tertiary">{new Date(h.data).toLocaleDateString('pt-BR')}</span>
          </li>
        ))}
        {data?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum evento registrado ainda.</p>}
      </ul>
    </Card>
  );
}
