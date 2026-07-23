'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card, KpiCard } from '@/components/ui';

interface Me {
  nome: string;
  cargo: string;
  departamento: string;
  filial: string | null;
  matricula: string;
  dataAdmissao: string;
  status: 'ATIVO' | 'INATIVO';
  email: string | null;
  telefone: string | null;
  feriasSaldo: number;
  feriasVencimento: string;
}

export default function PortalMeuPerfilPage() {
  const { data, isError } = useQuery({
    queryKey: ['portal', 'me'],
    queryFn: async () => (await api.get<Me>('/portal/me')).data,
    retry: false,
  });

  if (isError) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          Sua conta ainda não está vinculada a um cadastro de colaborador. Peça ao administrador para criar seu acesso em
          Configurações &gt; Usuários e permissões, associando-o ao seu cadastro.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Saldo de férias" value={data ? `${data.feriasSaldo} dias` : '—'} />
        <KpiCard label="Vencimento das férias" value={data ? new Date(data.feriasVencimento).toLocaleDateString('pt-BR') : '—'} />
        <KpiCard label="Status" value={data ? <Badge tone={data.status === 'ATIVO' ? 'green' : 'grey'}>{data.status}</Badge> : '—'} />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Meus dados</h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-text-tertiary">Nome</div><div>{data?.nome}</div></div>
          <div><div className="text-xs text-text-tertiary">Matrícula</div><div>{data?.matricula}</div></div>
          <div><div className="text-xs text-text-tertiary">Cargo</div><div>{data?.cargo}</div></div>
          <div><div className="text-xs text-text-tertiary">Departamento</div><div>{data?.departamento}</div></div>
          <div><div className="text-xs text-text-tertiary">Filial</div><div>{data?.filial ?? '—'}</div></div>
          <div><div className="text-xs text-text-tertiary">Admissão</div><div>{data ? new Date(data.dataAdmissao).toLocaleDateString('pt-BR') : '—'}</div></div>
          <div><div className="text-xs text-text-tertiary">E-mail</div><div>{data?.email ?? '—'}</div></div>
          <div><div className="text-xs text-text-tertiary">Telefone</div><div>{data?.telefone ?? '—'}</div></div>
        </div>
      </Card>
    </div>
  );
}
