'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';

interface Employee {
  id: string;
  nome: string;
}

interface SimulacaoFeriasResultado {
  employee: { id: string; nome: string };
  parametros: { dias: number; abonoDias: number };
  valorDiaria: number;
  valorFerias: number;
  tercoConstitucional: number;
  valorAbono: number;
  tercoAbono: number;
  totalBruto: number;
  aviso: string;
}

interface SimulacaoRescisaoResultado {
  employee: { id: string; nome: string };
  parametros: { tipo: string; dataPrevista: string; anosCompletos: number };
  saldoSalario: number;
  avisoPrevio: { dias: number; valorIndenizado: number };
  decimoTerceiroProporcional: number;
  ferias: { dias: number; valor: number; tercoConstitucional: number };
  fgts: { saldoConsiderado: number; saldoInformadoPeloUsuario: boolean; percentualMulta: number; valorMulta: number };
  totalBruto: number;
  aviso: string;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TIPO_LABEL: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Dispensa sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
};

export default function SimulacoesPage() {
  const [tab, setTab] = useState<'ferias' | 'rescisao'>('ferias');

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex gap-2">
        <Button variant={tab === 'ferias' ? 'primary' : 'secondary'} onClick={() => setTab('ferias')}>
          Simular férias
        </Button>
        <Button variant={tab === 'rescisao' ? 'primary' : 'secondary'} onClick={() => setTab('rescisao')}>
          Simular rescisão
        </Button>
      </div>

      {tab === 'ferias' ? <SimulacaoFerias employees={employees ?? []} /> : <SimulacaoRescisao employees={employees ?? []} />}
    </div>
  );
}

function SimulacaoFerias({ employees }: { employees: Employee[] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [dias, setDias] = useState('30');
  const [abonoDias, setAbonoDias] = useState('0');

  const simular = useMutation({
    mutationFn: async () =>
      (
        await api.post<SimulacaoFeriasResultado>('/dp/simulacoes/ferias', {
          employeeId,
          dias: Number(dias),
          abonoDias: Number(abonoDias),
        })
      ).data,
  });

  return (
    <Card>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          simular.mutate();
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
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Dias de férias</span>
          <input
            type="number"
            min={1}
            max={30}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            required
            className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Abono pecuniário (dias)</span>
          <input
            type="number"
            min={0}
            max={10}
            value={abonoDias}
            onChange={(e) => setAbonoDias(e.target.value)}
            className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <Button disabled={simular.isPending}>Simular</Button>
      </form>

      {simular.data && (
        <div className="mt-5 flex flex-col gap-2 border-t border-divider pt-4 text-sm">
          <Row label="Valor da diária" value={formatBRL(simular.data.valorDiaria)} />
          <Row label={`Férias (${simular.data.parametros.dias} dias)`} value={formatBRL(simular.data.valorFerias)} />
          <Row label="1/3 constitucional" value={formatBRL(simular.data.tercoConstitucional)} />
          {simular.data.parametros.abonoDias > 0 && (
            <>
              <Row label={`Abono pecuniário (${simular.data.parametros.abonoDias} dias)`} value={formatBRL(simular.data.valorAbono)} />
              <Row label="1/3 sobre o abono" value={formatBRL(simular.data.tercoAbono)} />
            </>
          )}
          <Row label="Total bruto" value={formatBRL(simular.data.totalBruto)} bold />
          <Badge tone="amber">{simular.data.aviso}</Badge>
        </div>
      )}
    </Card>
  );
}

function SimulacaoRescisao({ employees }: { employees: Employee[] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [tipo, setTipo] = useState<'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'ACORDO'>('SEM_JUSTA_CAUSA');
  const [dataPrevista, setDataPrevista] = useState('');
  const [saldoFgtsEstimado, setSaldoFgtsEstimado] = useState('');

  const simular = useMutation({
    mutationFn: async () =>
      (
        await api.post<SimulacaoRescisaoResultado>('/dp/simulacoes/rescisao', {
          employeeId,
          tipo,
          dataPrevista,
          ...(saldoFgtsEstimado ? { saldoFgtsEstimado: Number(saldoFgtsEstimado) } : {}),
        })
      ).data,
  });

  return (
    <Card>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          simular.mutate();
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
            {employees.map((e) => (
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
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          >
            <option value="SEM_JUSTA_CAUSA">Dispensa sem justa causa</option>
            <option value="PEDIDO_DEMISSAO">Pedido de demissão</option>
            <option value="ACORDO">Acordo (art. 484-A)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Data prevista</span>
          <input
            type="date"
            value={dataPrevista}
            onChange={(e) => setDataPrevista(e.target.value)}
            required
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Saldo FGTS (opcional)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Estimar automaticamente"
            value={saldoFgtsEstimado}
            onChange={(e) => setSaldoFgtsEstimado(e.target.value)}
            className="w-44 rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <Button disabled={simular.isPending}>Simular</Button>
      </form>

      {simular.data && (
        <div className="mt-5 flex flex-col gap-2 border-t border-divider pt-4 text-sm">
          <p className="text-text-tertiary">
            {TIPO_LABEL[simular.data.parametros.tipo]} · {simular.data.parametros.anosCompletos} ano(s) completo(s) de casa
          </p>
          <Row label="Saldo de salário" value={formatBRL(simular.data.saldoSalario)} />
          <Row
            label={`Aviso prévio indenizado (${simular.data.avisoPrevio.dias} dias)`}
            value={formatBRL(simular.data.avisoPrevio.valorIndenizado)}
          />
          <Row label="13º proporcional" value={formatBRL(simular.data.decimoTerceiroProporcional)} />
          <Row label={`Férias (${simular.data.ferias.dias} dias) + 1/3`} value={formatBRL(simular.data.ferias.valor + simular.data.ferias.tercoConstitucional)} />
          <Row
            label={`Multa FGTS (${(simular.data.fgts.percentualMulta * 100).toFixed(0)}% sobre ${formatBRL(simular.data.fgts.saldoConsiderado)}${simular.data.fgts.saldoInformadoPeloUsuario ? '' : ', estimado'})`}
            value={formatBRL(simular.data.fgts.valorMulta)}
          />
          <Row label="Total bruto" value={formatBRL(simular.data.totalBruto)} bold />
          <Badge tone="amber">{simular.data.aviso}</Badge>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
