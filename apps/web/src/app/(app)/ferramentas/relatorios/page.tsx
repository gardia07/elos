'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

type ReportKey = 'colaboradores' | 'headcount' | 'documentos' | 'turnover';

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: 'colaboradores', label: 'Colaboradores por departamento' },
  { key: 'headcount', label: 'Headcount x tempo' },
  { key: 'documentos', label: 'Conformidade documental' },
  { key: 'turnover', label: 'Turnover por departamento' },
];

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function useReportData(key: ReportKey) {
  const employees = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<{ nome: string; departamento: string; cargo: string; status: string }[]>('/rh/employees')).data,
    enabled: key === 'colaboradores',
  });
  const headcount = useQuery({
    queryKey: ['indicadores', 'headcount'],
    queryFn: async () => (await api.get<{ mes: string; total: number }[]>('/indicadores/headcount')).data,
    enabled: key === 'headcount',
  });
  const documentos = useQuery({
    queryKey: ['rh', 'documents', 'all-employees'],
    queryFn: async () =>
      (await api.get<{ documentos: { status: string; requirement: { nome: string }; employee: { nome: string } }[] }>('/rh/documents/all-employees')).data,
    enabled: key === 'documentos',
  });
  const turnover = useQuery({
    queryKey: ['indicadores', 'turnover'],
    queryFn: async () => (await api.get<{ porDepartamento: { departamento: string; percentual: number; saidas: number }[] }>('/indicadores/turnover')).data,
    enabled: key === 'turnover',
  });
  return { employees, headcount, documentos, turnover };
}

export default function RelatoriosPage() {
  const [key, setKey] = useState<ReportKey>('colaboradores');
  const { employees, headcount, documentos, turnover } = useReportData(key);

  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  if (key === 'colaboradores') {
    headers = ['Nome', 'Departamento', 'Cargo', 'Status'];
    rows = (employees.data ?? []).map((e) => [e.nome, e.departamento, e.cargo, e.status]);
  } else if (key === 'headcount') {
    headers = ['Mês', 'Total de colaboradores'];
    rows = (headcount.data ?? []).map((h) => [h.mes, h.total]);
  } else if (key === 'documentos') {
    headers = ['Documento', 'Colaborador', 'Status'];
    rows = (documentos.data?.documentos ?? []).map((d) => [d.requirement.nome, d.employee.nome, d.status]);
  } else if (key === 'turnover') {
    headers = ['Departamento', 'Turnover (%)', 'Saídas (3 meses)'];
    rows = (turnover.data?.porDepartamento ?? []).map((t) => [t.departamento, t.percentual, t.saidas]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Relatório</span>
          <select value={key} onChange={(e) => setKey(e.target.value as ReportKey)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
            {REPORTS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={() => downloadCsv(`${key}.csv`, headers, rows)} disabled={rows.length === 0}>
          Exportar CSV
        </Button>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              {headers.map((h) => (
                <th key={h} className="px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-divider last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className={`px-5 py-3 ${j === 0 ? 'font-medium' : 'text-text-secondary'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Sem dados para este relatório.</p>}
      </Card>
    </div>
  );
}
