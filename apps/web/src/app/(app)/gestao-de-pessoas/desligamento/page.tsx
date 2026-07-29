'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate, TERMINATION_STATUS_LABEL, TERMINATION_STATUS_TONE, TERMINATION_TIPO_LABEL, TerminationStatusValue, TerminationTipo } from '@/lib/format';
import { Badge, Button, Card } from '@/components/ui';

interface Termination {
  id: string;
  nome: string;
  cargo: string;
  data: string;
  tipo: TerminationTipo;
  status: TerminationStatusValue;
}

interface Employee {
  id: string;
  nome: string;
}

const TIPOS_MOTIVO_OBRIGATORIO: TerminationTipo[] = ['JUSTA_CAUSA', 'RESCISAO_INDIRETA'];

export default function DesligamentoPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(!!searchParams.get('employeeId'));
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') ?? '');
  const [tipo, setTipo] = useState<TerminationTipo>('SEM_JUSTA_CAUSA');
  const [data, setData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [avisoPrevioTipo, setAvisoPrevioTipo] = useState('');
  const [dataBeneficioInss, setDataBeneficioInss] = useState('');

  const { data: terminations } = useQuery({
    queryKey: ['terminations'],
    queryFn: async () => (await api.get<Termination[]>('/rh/terminations')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'ativos'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees', { params: { status: 'ATIVO' } })).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/rh/terminations', {
        employeeId,
        tipo,
        data,
        motivo: motivo || undefined,
        avisoPrevioTipo: avisoPrevioTipo || undefined,
        dataBeneficioInss: tipo === 'APOSENTADORIA' ? dataBeneficioInss || undefined : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      setShowForm(false);
    },
  });

  const motivoObrigatorio = TIPOS_MOTIVO_OBRIGATORIO.includes(tipo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Link href="/gestao-de-pessoas/desligamento/prazos">
          <Button variant="secondary">Prazos em aberto</Button>
        </Link>
        <Link href="/cadastros/checklist-desligamento">
          <Button variant="secondary">Configurar checklist</Button>
        </Link>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Novo desligamento'}</Button>
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
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
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
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TerminationTipo)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                {Object.entries(TERMINATION_TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Aviso prévio</span>
              <select
                value={avisoPrevioTipo}
                onChange={(e) => setAvisoPrevioTipo(e.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="">Não informado</option>
                <option value="TRABALHADO">Trabalhado</option>
                <option value="INDENIZADO">Indenizado</option>
                <option value="ISENTO">Isento</option>
              </select>
            </label>
            {tipo === 'APOSENTADORIA' && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Data do benefício INSS</span>
                <input
                  type="date"
                  value={dataBeneficioInss}
                  onChange={(e) => setDataBeneficioInss(e.target.value)}
                  required
                  className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">
                Motivo {motivoObrigatorio && <span className="text-danger">(obrigatório para este tipo)</span>}
              </span>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required={motivoObrigatorio}
                className="w-64 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Iniciar
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {terminations?.map((t) => (
          <Link key={t.id} href={`/gestao-de-pessoas/desligamento/${t.id}`}>
            <Card className="flex items-center justify-between hover:border-accent">
              <div>
                <div className="font-medium">{t.nome}</div>
                <div className="text-sm text-text-secondary">
                  {t.cargo} · {TERMINATION_TIPO_LABEL[t.tipo]} · {formatDate(t.data)}
                </div>
              </div>
              <Badge tone={TERMINATION_STATUS_TONE[t.status]}>{TERMINATION_STATUS_LABEL[t.status]}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
