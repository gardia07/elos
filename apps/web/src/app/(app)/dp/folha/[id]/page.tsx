'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface RunDetail {
  id: string;
  competencia: string;
  status: 'ABERTO' | 'PROCESSADA';
  esocialSent: boolean;
  totals: { proventos: number; descontos: number; liquido: number };
  items: {
    id: string;
    proventos: string;
    descontos: string;
    liquido: string;
    origem: 'CALCULADO' | 'IMPORTADO';
    employee: { nome: string };
  }[];
  guides: { id: string; guia: string; status: 'PENDENTE' | 'GERADA' }[];
}

type ColumnAlvo = 'IGNORAR' | 'MATRICULA' | 'CPF' | 'NOME' | 'RUBRICA';
type RubricaTipo = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO';

interface ColumnMapping {
  indice: number;
  alvo: ColumnAlvo;
  descricao?: string;
  rubricaTipo?: RubricaTipo;
}

interface PreviewResponse {
  headers: string[];
  amostra: string[][];
  mapeamentoSugerido: ColumnMapping[];
  templateAplicado: string | null;
}

interface ImportBatchResult {
  arquivoNome: string;
  linhasTotal: number;
  linhasImportadas: number;
  linhasComErro: number;
  erros: { linha: number; identificador: string; motivo: string }[] | null;
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

  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [amostra, setAmostra] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[] | null>(null);
  const [templateAplicado, setTemplateAplicado] = useState<string | null>(null);
  const [templateNome, setTemplateNome] = useState('');
  const [salvarTemplate, setSalvarTemplate] = useState(false);
  const [resultado, setResultado] = useState<ImportBatchResult | null>(null);

  const openImport = () => {
    setFile(null);
    setHeaders([]);
    setAmostra([]);
    setMapping(null);
    setTemplateAplicado(null);
    setTemplateNome('');
    setSalvarTemplate(false);
    setResultado(null);
    setImportOpen(true);
  };

  const preview = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('arquivo', f);
      return (await api.post<PreviewResponse>(`/dp/payroll/runs/${id}/import/preview`, form)).data;
    },
    onSuccess: (data) => {
      setHeaders(data.headers);
      setAmostra(data.amostra);
      setMapping(data.mapeamentoSugerido);
      setTemplateAplicado(data.templateAplicado);
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async () =>
      api.post('/dp/payroll/import-templates', {
        nome: templateNome.trim(),
        mapeamento: JSON.stringify({ headers, mapeamento: mapping }),
      }),
  });

  const commit = useMutation({
    mutationFn: async () => {
      if (!file || !mapping) throw new Error('Selecione o arquivo e confirme o mapeamento.');
      const form = new FormData();
      form.append('arquivo', file);
      form.append('mapeamento', JSON.stringify(mapping));
      return (await api.post<ImportBatchResult>(`/dp/payroll/runs/${id}/import/commit`, form)).data;
    },
    onSuccess: (data) => {
      setResultado(data);
      invalidate();
      if (salvarTemplate && templateNome.trim()) saveTemplate.mutate();
    },
  });

  const updateMapping = (indice: number, patch: Partial<ColumnMapping>) => {
    setMapping((prev) => prev?.map((m) => (m.indice === indice ? { ...m, ...patch } : m)) ?? null);
  };

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
        <Button variant="secondary" onClick={openImport}>
          Importar planilha da contabilidade
        </Button>
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
                <th className="pb-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((i) => (
                <tr key={i.id} className="border-t border-divider">
                  <td className="py-2">{i.employee.nome}</td>
                  <td className="py-2">{formatBRL(Number(i.proventos))}</td>
                  <td className="py-2 text-danger">{formatBRL(Number(i.descontos))}</td>
                  <td className="py-2 font-medium">{formatBRL(Number(i.liquido))}</td>
                  <td className="py-2">
                    <Badge tone={i.origem === 'IMPORTADO' ? 'blue' : 'grey'}>
                      {i.origem === 'IMPORTADO' ? 'Importado' : 'Calculado'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {run.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-tertiary">
                    Processe a folha ou importe uma planilha para gerar os holerites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Drawer open={importOpen} onClose={() => setImportOpen(false)} title="Importar planilha da contabilidade">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Arquivo (.csv, .xls ou .xlsx)</label>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setMapping(null);
                setResultado(null);
                if (f) preview.mutate(f);
              }}
              className="w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
            />
            {preview.isPending && <p className="mt-2 text-xs text-text-tertiary">Lendo planilha…</p>}
            {preview.isError && (
              <p className="mt-2 text-xs text-danger">Não foi possível ler o arquivo. Confira o formato e tente novamente.</p>
            )}
          </div>

          {mapping && (
            <>
              {templateAplicado && (
                <p className="text-xs text-text-secondary">
                  Modelo aplicado automaticamente: <span className="font-medium">{templateAplicado}</span>
                </p>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold">Mapeamento de colunas</h4>
                <div className="overflow-x-auto rounded-[10px] border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-alt text-left text-text-tertiary">
                        <th className="p-2">Coluna</th>
                        <th className="p-2">Amostra</th>
                        <th className="p-2">Identificação / Rubrica</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapping.map((m) => (
                        <tr key={m.indice} className="border-t border-divider">
                          <td className="p-2 font-medium">{headers[m.indice]}</td>
                          <td className="p-2 text-text-tertiary">
                            {amostra.map((row) => row[m.indice]).filter(Boolean).slice(0, 2).join(', ')}
                          </td>
                          <td className="p-2">
                            <select
                              value={m.alvo}
                              onChange={(e) => updateMapping(m.indice, { alvo: e.target.value as ColumnAlvo })}
                              className="rounded-[10px] border border-border-strong bg-surface px-2 py-1"
                            >
                              <option value="IGNORAR">Ignorar</option>
                              <option value="MATRICULA">Matrícula (identificação)</option>
                              <option value="CPF">CPF (identificação)</option>
                              <option value="NOME">Nome</option>
                              <option value="RUBRICA">Rubrica (valor)</option>
                            </select>
                          </td>
                          <td className="p-2">
                            {m.alvo === 'RUBRICA' && (
                              <select
                                value={m.rubricaTipo ?? 'PROVENTO'}
                                onChange={(e) => updateMapping(m.indice, { rubricaTipo: e.target.value as RubricaTipo })}
                                className="rounded-[10px] border border-border-strong bg-surface px-2 py-1"
                              >
                                <option value="PROVENTO">Provento</option>
                                <option value="DESCONTO">Desconto</option>
                                <option value="INFORMATIVO">Informativo</option>
                              </select>
                            )}
                          </td>
                          <td className="p-2">
                            {m.alvo === 'RUBRICA' && (
                              <input
                                value={m.descricao ?? ''}
                                onChange={(e) => updateMapping(m.indice, { descricao: e.target.value })}
                                className="w-full rounded-[10px] border border-border-strong bg-surface px-2 py-1"
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="salvar-template"
                  type="checkbox"
                  checked={salvarTemplate}
                  onChange={(e) => setSalvarTemplate(e.target.checked)}
                />
                <label htmlFor="salvar-template" className="text-sm">
                  Salvar este mapeamento como modelo para os próximos meses
                </label>
              </div>
              {salvarTemplate && (
                <input
                  value={templateNome}
                  onChange={(e) => setTemplateNome(e.target.value)}
                  placeholder="Nome do modelo (ex: Folha Contabilidade XYZ)"
                  className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
                />
              )}

              <Button
                disabled={commit.isPending}
                onClick={() => commit.mutate()}
              >
                Confirmar importação
              </Button>
            </>
          )}

          {resultado && (
            <Card className="flex flex-col gap-2">
              <p className="text-sm">
                <span className="font-medium">{resultado.linhasImportadas}</span> de {resultado.linhasTotal} linhas importadas.
              </p>
              {resultado.linhasComErro > 0 && (
                <div>
                  <p className="text-sm text-danger">{resultado.linhasComErro} linha(s) com erro:</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-text-secondary">
                    {resultado.erros?.map((e, idx) => (
                      <li key={idx}>
                        Linha {e.linha} ({e.identificador || 'sem identificador'}): {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      </Drawer>
    </div>
  );
}
