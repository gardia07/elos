'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface Exam {
  id: string;
  tipo: 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_FUNCAO' | 'DEMISSIONAL';
  dataPrevista: string;
  dataRealizada: string | null;
  resultado: 'APTO' | 'INAPTO' | null;
  esocialSent: boolean;
  status: string;
  employee: { nome: string };
}

interface Employee {
  id: string;
  nome: string;
}

const TIPO_LABEL = {
  ADMISSIONAL: 'Admissional',
  PERIODICO: 'Periódico',
  RETORNO_TRABALHO: 'Retorno ao trabalho',
  MUDANCA_FUNCAO: 'Mudança de função',
  DEMISSIONAL: 'Demissional',
} as const;

const STATUS_TONE: Record<string, 'green' | 'blue' | 'amber' | 'red'> = {
  Concluído: 'green',
  Agendado: 'blue',
  Vencendo: 'amber',
  Atrasado: 'red',
};

export default function ExamesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [tipo, setTipo] = useState<Exam['tipo']>('PERIODICO');
  const [dataPrevista, setDataPrevista] = useState('');

  const { data: exams } = useQuery({
    queryKey: ['sst', 'exams'],
    queryFn: async () => (await api.get<Exam[]>('/sst/exams')).data,
  });
  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });
  const { data: detail } = useQuery({
    queryKey: ['sst', 'exams', openId],
    queryFn: async () => (await api.get<Exam>(`/sst/exams/${openId}`)).data,
    enabled: !!openId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sst', 'exams'] });
  };

  const create = useMutation({
    mutationFn: async () => api.post('/sst/exams', { employeeId, tipo, dataPrevista }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setDataPrevista('');
    },
  });

  const registerResult = useMutation({
    mutationFn: async (resultado: 'APTO' | 'INAPTO') => api.post(`/sst/exams/${openId}/result`, { resultado }),
    onSuccess: invalidate,
  });

  const sendEsocial = useMutation({
    mutationFn: async () => api.post(`/sst/exams/${openId}/esocial`),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Agendar exame'}</Button>
      </div>

      {showForm && (
        <Card>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Colaborador</span>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="">Selecione…</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as Exam['tipo'])} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                {Object.entries(TIPO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data prevista</span>
              <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Agendar
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Colaborador</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Data prevista</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">eSocial S-2220</th>
            </tr>
          </thead>
          <tbody>
            {exams?.map((e) => (
              <tr key={e.id} className="cursor-pointer border-b border-divider last:border-0 hover:bg-surface-alt" onClick={() => setOpenId(e.id)}>
                <td className="px-5 py-3 font-medium">{e.employee.nome}</td>
                <td className="px-5 py-3">{TIPO_LABEL[e.tipo]}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(e.dataPrevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[e.status] ?? 'grey'}>{e.status}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={e.esocialSent ? 'green' : 'red'}>{e.esocialSent ? 'Enviado' : 'Pendente'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exams?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum exame agendado.</p>}
      </Card>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.employee.nome ?? ''}>
        {detail && (
          <div className="flex flex-col gap-4">
            <Badge tone={STATUS_TONE[detail.status] ?? 'grey'}>{detail.status}</Badge>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-text-tertiary">Data prevista</div>
                <div>{new Date(detail.dataPrevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Data realizada</div>
                <div>{detail.dataRealizada ? new Date(detail.dataRealizada).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Resultado</div>
                <div>{detail.resultado ?? '—'}</div>
              </div>
            </div>

            {!detail.resultado && (
              <div className="flex gap-2">
                <Button onClick={() => registerResult.mutate('APTO')} disabled={registerResult.isPending}>
                  Registrar Apto
                </Button>
                <Button variant="danger" onClick={() => registerResult.mutate('INAPTO')} disabled={registerResult.isPending}>
                  Registrar Inapto
                </Button>
              </div>
            )}

            {!detail.esocialSent && (
              <Button variant="secondary" onClick={() => sendEsocial.mutate()} disabled={sendEsocial.isPending}>
                Enviar evento S-2220
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
