'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface Policy {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
  versao: number;
  ativo: boolean;
  aceites: number;
  totalAtivos: number;
  cobertura: number;
}

interface PolicyDetail extends Policy {
  acknowledgments: { id: string; aceitoEm: string; employee: { nome: string; departamento: string } }[];
}

interface Employee {
  id: string;
  nome: string;
}

export default function PoliticasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [ackEmployeeId, setAckEmployeeId] = useState('');

  const { data: policies } = useQuery({
    queryKey: ['compliance', 'policies'],
    queryFn: async () => (await api.get<Policy[]>('/compliance/policies')).data,
  });
  const { data: detail } = useQuery({
    queryKey: ['compliance', 'policies', openId],
    queryFn: async () => (await api.get<PolicyDetail>(`/compliance/policies/${openId}`)).data,
    enabled: !!openId,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['compliance', 'policies'] });
    queryClient.invalidateQueries({ queryKey: ['compliance', 'overview'] });
  };

  const create = useMutation({
    mutationFn: async () => api.post('/compliance/policies', { titulo, categoria, conteudo }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setTitulo('');
      setCategoria('');
      setConteudo('');
    },
  });

  const acknowledge = useMutation({
    mutationFn: async () => api.post(`/compliance/policies/${openId}/acknowledge`, { employeeId: ackEmployeeId }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['compliance', 'policies', openId] });
      setAckEmployeeId('');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Nova política'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Título</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Categoria</span>
                <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ética, LGPD…" required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Conteúdo</span>
              <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending} className="self-start">
              Publicar
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Título</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Versão</th>
              <th className="px-5 py-3 font-medium">Cobertura de aceite</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {policies?.map((p) => (
              <tr key={p.id} className="cursor-pointer border-b border-divider last:border-0 hover:bg-surface-alt" onClick={() => setOpenId(p.id)}>
                <td className="px-5 py-3 font-medium">{p.titulo}</td>
                <td className="px-5 py-3">{p.categoria}</td>
                <td className="px-5 py-3 text-text-secondary">v{p.versao}</td>
                <td className="px-5 py-3">
                  <Badge tone={p.cobertura >= 90 ? 'green' : p.cobertura >= 50 ? 'amber' : 'red'}>
                    {p.cobertura}% ({p.aceites}/{p.totalAtivos})
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={p.ativo ? 'green' : 'grey'}>{p.ativo ? 'Ativa' : 'Inativa'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma política cadastrada.</p>}
      </Card>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.titulo ?? ''}>
        {detail && (
          <div className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap text-sm text-text-secondary">{detail.conteudo}</p>

            <div className="border-t border-divider pt-3">
              <h4 className="mb-2 text-sm font-semibold">Registrar aceite</h4>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ackEmployeeId) acknowledge.mutate();
                }}
              >
                <select value={ackEmployeeId} onChange={(e) => setAckEmployeeId(e.target.value)} className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm">
                  <option value="">Selecione o colaborador…</option>
                  {employees?.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
                <Button type="submit" disabled={acknowledge.isPending || !ackEmployeeId}>
                  Registrar
                </Button>
              </form>
            </div>

            <div className="border-t border-divider pt-3">
              <h4 className="mb-2 text-sm font-semibold">Quem já aceitou ({detail.acknowledgments.length})</h4>
              <ul className="flex flex-col gap-1 text-sm">
                {detail.acknowledgments.map((a) => (
                  <li key={a.id} className="flex justify-between text-text-secondary">
                    <span>{a.employee.nome} · {a.employee.departamento}</span>
                    <span className="text-xs">{new Date(a.aceitoEm).toLocaleDateString('pt-BR')}</span>
                  </li>
                ))}
                {detail.acknowledgments.length === 0 && <li className="text-text-tertiary">Ninguém aceitou ainda.</li>}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
