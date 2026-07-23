'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface RunDetail {
  id: string;
  competencia: string;
  status: 'ABERTO' | 'PROCESSADA';
  esocialSent: boolean;
  totals: { proventos: number; descontos: number; liquido: number };
  items: { id: string; proventos: string; descontos: string; liquido: string; employee: { nome: string } }[];
  guides: { id: string; guia: string; status: 'PENDENTE' | 'GERADA' }[];
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PayrollRunPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: run } = useQuery({
    queryKey: ['dp', 'payroll', 'run', id],
    queryFn: async () => (await api.get<RunDetail>(`/dp/payroll/runs/${id}`)).data,
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dp', 'payroll', 'run', id] });

  const process = useMutation({
    mutationFn: async () => api.post(`/dp/payroll/runs/${id}/process`),
    onSuccess: invalidate,
  });
  const reopen = useMutation({
    mutationFn: async () => api.post(`/dp/payroll/runs/${id}/reopen`),
    onSuccess: invalidate,
  });
  const sendEsocial = useMutation({
    mutationFn: async () => api.post(`/dp/payroll/runs/${id}/esocial`),
    onSuccess: invalidate,
  });
  const generateGuide = useMutation({
    mutationFn: async (guideId: string) => api.post(`/dp/payroll/guides/${guideId}/generate`),
    onSuccess: invalidate,
  });

  if (!run) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/dp/folha" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Folha de Pagamento
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Competência {run.competencia}</h2>
        </div>
        <Badge tone={run.status === 'PROCESSADA' ? 'green' : 'amber'}>
          {run.status === 'PROCESSADA' ? 'Processada' : 'Em aberto'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">Total de proventos</div>
          <div className="text-xl font-semibold">{formatBRL(run.totals.proventos)}</div>
        </Card>
        <Card>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">Total de descontos</div>
          <div className="text-xl font-semibold">{formatBRL(run.totals.descontos)}</div>
        </Card>
        <Card>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">Líquido a pagar</div>
          <div className="text-xl font-semibold">{formatBRL(run.totals.liquido)}</div>
        </Card>
      </div>

      <div className="flex gap-2">
        {run.status === 'ABERTO' ? (
          <Button disabled={process.isPending} onClick={() => process.mutate()}>
            Processar folha
          </Button>
        ) : (
          <Button variant="secondary" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
            Reabrir folha
          </Button>
        )}
        {run.status === 'PROCESSADA' && !run.esocialSent && (
          <Button variant="secondary" disabled={sendEsocial.isPending} onClick={() => sendEsocial.mutate()}>
            Enviar eSocial (S-1200)
          </Button>
        )}
        {run.esocialSent && <Badge tone="blue">eSocial S-1200 transmitido</Badge>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Guias</h3>
        <Card>
          <table className="w-full text-sm">
            <tbody>
              {run.guides.map((g) => (
                <tr key={g.id} className="border-b border-divider last:border-0">
                  <td className="py-2">{g.guia}</td>
                  <td className="py-2 text-right">
                    {g.status === 'GERADA' ? (
                      <Badge tone="green">Gerada</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled={run.status !== 'PROCESSADA' || generateGuide.isPending}
                        onClick={() => generateGuide.mutate(g.id)}
                      >
                        Gerar guia
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Holerites</h3>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-tertiary">
                <th className="pb-2">Colaborador</th>
                <th className="pb-2">Proventos</th>
                <th className="pb-2">Descontos</th>
                <th className="pb-2">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((i) => (
                <tr key={i.id} className="border-t border-divider">
                  <td className="py-2">{i.employee.nome}</td>
                  <td className="py-2">{formatBRL(Number(i.proventos))}</td>
                  <td className="py-2 text-danger">{formatBRL(Number(i.descontos))}</td>
                  <td className="py-2 font-medium">{formatBRL(Number(i.liquido))}</td>
                </tr>
              ))}
              {run.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-text-tertiary">
                    Processe a folha para gerar os holerites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
