'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Card, Drawer, EmptyState, KpiCard } from '@/components/ui';

interface CustoColaboradorResumo {
  employeeId: string;
  nome: string;
  departamento: string;
  origemFolha: 'CALCULADO' | 'IMPORTADO' | null;
  custoFolha: number;
  custoBeneficios: number;
  custoTotal: number;
}

interface CustoResumo {
  competencia: string;
  temFolhaImportada: boolean;
  porColaborador: CustoColaboradorResumo[];
  porDepartamento: { departamento: string; custoTotal: number; colaboradores: number }[];
  totalGeral: number;
}

interface CustoColaboradorDetalhe {
  employee: { id: string; nome: string; matricula: string; departamento: string };
  competencia: string;
  folha: {
    origem: 'CALCULADO' | 'IMPORTADO';
    proventos: number;
    descontos: number;
    liquido: number;
    rubricas: { descricao: string; tipo: 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO'; valor: number }[];
  } | null;
  beneficios: { tipo: string; categoria: string; valorEmpresa: number; valorColaborador: number; valorTotal: number }[];
  custoTotalEmpresa: number;
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CustosPage() {
  const [competencia, setCompetencia] = useState(mesAtual());
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const { data: resumo, isLoading } = useQuery({
    queryKey: ['dp', 'payroll', 'custos', 'resumo', competencia],
    queryFn: async () => (await api.get<CustoResumo>('/dp/payroll/custos/resumo', { params: { competencia } })).data,
  });

  const { data: detalhe } = useQuery({
    queryKey: ['dp', 'payroll', 'custos', 'colaborador', selecionado, competencia],
    queryFn: async () =>
      (
        await api.get<CustoColaboradorDetalhe>(`/dp/payroll/custos/colaborador/${selecionado}`, {
          params: { competencia },
        })
      ).data,
    enabled: !!selecionado,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Competência</label>
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </div>

      {isLoading && <p className="text-sm text-text-tertiary">Carregando…</p>}

      {resumo && (
        <>
          {!resumo.temFolhaImportada && (
            <Card className="border-warning/40 bg-warning-bg text-sm text-warning">
              Nenhuma folha calculada ou importada para {competencia} ainda — os valores abaixo consideram só os
              benefícios apurados nessa competência.
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Custo total no mês" value={formatBRL(resumo.totalGeral)} />
            <KpiCard label="Colaboradores" value={resumo.porColaborador.length} />
            <KpiCard label="Departamentos" value={resumo.porDepartamento.length} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Custo por departamento</h3>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-tertiary">
                    <th className="pb-2">Departamento</th>
                    <th className="pb-2">Colaboradores</th>
                    <th className="pb-2">Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.porDepartamento.map((d) => (
                    <tr key={d.departamento} className="border-t border-divider">
                      <td className="py-2">{d.departamento}</td>
                      <td className="py-2">{d.colaboradores}</td>
                      <td className="py-2 font-medium">{formatBRL(d.custoTotal)}</td>
                    </tr>
                  ))}
                  {resumo.porDepartamento.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState>Nenhum colaborador ativo encontrado.</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Custo por colaborador</h3>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-tertiary">
                    <th className="pb-2">Colaborador</th>
                    <th className="pb-2">Departamento</th>
                    <th className="pb-2">Folha</th>
                    <th className="pb-2">Benefícios</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.porColaborador.map((c) => (
                    <tr
                      key={c.employeeId}
                      className="cursor-pointer border-t border-divider hover:bg-surface-alt"
                      onClick={() => setSelecionado(c.employeeId)}
                    >
                      <td className="py-2">{c.nome}</td>
                      <td className="py-2">{c.departamento}</td>
                      <td className="py-2">{formatBRL(c.custoFolha)}</td>
                      <td className="py-2">{formatBRL(c.custoBeneficios)}</td>
                      <td className="py-2 font-medium">{formatBRL(c.custoTotal)}</td>
                      <td className="py-2">
                        {c.origemFolha ? (
                          <Badge tone={c.origemFolha === 'IMPORTADO' ? 'blue' : 'grey'}>
                            {c.origemFolha === 'IMPORTADO' ? 'Importado' : 'Calculado'}
                          </Badge>
                        ) : (
                          <Badge tone="amber">Sem folha</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {resumo.porColaborador.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState>Nenhum colaborador ativo encontrado.</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}

      <Drawer open={!!selecionado} onClose={() => setSelecionado(null)} title={detalhe?.employee.nome ?? 'Colaborador'}>
        {detalhe && (
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-text-tertiary">
              Matrícula {detalhe.employee.matricula} · {detalhe.employee.departamento}
            </p>

            <KpiCard label="Custo total no mês" value={formatBRL(detalhe.custoTotalEmpresa)} />

            <div>
              <h4 className="mb-2 font-semibold">Folha</h4>
              {detalhe.folha ? (
                <Card className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span>Proventos</span>
                    <span className="font-medium">{formatBRL(detalhe.folha.proventos)}</span>
                  </div>
                  <div className="flex items-center justify-between text-danger">
                    <span>Descontos</span>
                    <span>{formatBRL(detalhe.folha.descontos)}</span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span>Líquido</span>
                    <span>{formatBRL(detalhe.folha.liquido)}</span>
                  </div>
                  {detalhe.folha.rubricas.length > 0 && (
                    <div className="mt-2 border-t border-divider pt-2">
                      {detalhe.folha.rubricas.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-text-secondary">
                          <span>{r.descricao}</span>
                          <span className={r.tipo === 'DESCONTO' ? 'text-danger' : ''}>{formatBRL(r.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <EmptyState>Sem folha calculada/importada nessa competência.</EmptyState>
              )}
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Benefícios</h4>
              {detalhe.beneficios.length > 0 ? (
                <Card className="flex flex-col gap-2">
                  {detalhe.beneficios.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{b.tipo}</span>
                      <span className="font-medium">{formatBRL(b.valorEmpresa)}</span>
                    </div>
                  ))}
                </Card>
              ) : (
                <EmptyState>Sem benefícios apurados nessa competência.</EmptyState>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
