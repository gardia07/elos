'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface Accident {
  id: string;
  tipoAcidente: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';
  dataAcidente: string;
  status: 'EM_ANALISE' | 'ENCERRADA';
  esocialSent: boolean;
  employee: { nome: string };
}

interface AccidentDetail extends Accident {
  cargo: string;
  dataEmissaoCat: string;
  comAfastamento: boolean;
  diasAfastamento: number;
  descricao: string | null;
  causaRaiz: string | null;
  acaoCorretiva: string | null;
  emissaoAtrasada: boolean;
  auditLog: { id: string; action: string; createdAt: string }[];
}

interface Employee {
  id: string;
  nome: string;
}

const TIPO_LABEL = { TIPICO: 'Típico', TRAJETO: 'Trajeto', DOENCA_OCUPACIONAL: 'Doença ocupacional' } as const;

export default function AcidentesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [tipoAcidente, setTipoAcidente] = useState<'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL'>('TIPICO');
  const [comAfastamento, setComAfastamento] = useState(false);
  const [diasAfastamento, setDiasAfastamento] = useState('');
  const [dataAcidente, setDataAcidente] = useState('');
  const [dataEmissaoCat, setDataEmissaoCat] = useState('');
  const [descricao, setDescricao] = useState('');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [acaoCorretiva, setAcaoCorretiva] = useState('');
  const [notaEncerramento, setNotaEncerramento] = useState('');

  const { data: accidents } = useQuery({
    queryKey: ['sst', 'accidents'],
    queryFn: async () => (await api.get<Accident[]>('/sst/accidents')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => (await api.get<Employee[]>('/rh/employees')).data,
  });

  const { data: detail } = useQuery({
    queryKey: ['sst', 'accidents', openId],
    queryFn: async () => (await api.get<AccidentDetail>(`/sst/accidents/${openId}`)).data,
    enabled: !!openId,
  });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['sst', 'accidents'] });
  const invalidateDetail = () => queryClient.invalidateQueries({ queryKey: ['sst', 'accidents', openId] });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/sst/accidents', {
        employeeId,
        tipoAcidente,
        comAfastamento,
        diasAfastamento: comAfastamento ? Number(diasAfastamento || 0) : undefined,
        dataAcidente,
        dataEmissaoCat,
        descricao: descricao || undefined,
      }),
    onSuccess: () => {
      invalidateList();
      setShowForm(false);
      setEmployeeId('');
      setComAfastamento(false);
      setDiasAfastamento('');
      setDataAcidente('');
      setDataEmissaoCat('');
      setDescricao('');
    },
  });

  const sendEsocial = useMutation({
    mutationFn: async (id: string) => api.post(`/sst/accidents/${id}/esocial`),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
    },
  });

  const saveInvestigation = useMutation({
    mutationFn: async () => api.post(`/sst/accidents/${openId}/investigation`, { causaRaiz, acaoCorretiva }),
    onSuccess: invalidateDetail,
  });

  const closeAccident = useMutation({
    mutationFn: async () => api.post(`/sst/accidents/${openId}/close`, { notaEncerramento: notaEncerramento || undefined }),
    onSuccess: () => {
      invalidateList();
      invalidateDetail();
    },
  });

  const openDrawer = (id: string, d?: AccidentDetail) => {
    setOpenId(id);
    setCausaRaiz(d?.causaRaiz ?? '');
    setAcaoCorretiva(d?.acaoCorretiva ?? '');
    setNotaEncerramento('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Registrar CAT'}</Button>
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
              <select value={tipoAcidente} onChange={(e) => setTipoAcidente(e.target.value as typeof tipoAcidente)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                <option value="TIPICO">Típico</option>
                <option value="TRAJETO">Trajeto</option>
                <option value="DOENCA_OCUPACIONAL">Doença ocupacional</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Data do acidente</span>
              <input type="date" value={dataAcidente} onChange={(e) => setDataAcidente(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Emissão da CAT</span>
              <input type="date" value={dataEmissaoCat} onChange={(e) => setDataEmissaoCat(e.target.value)} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={comAfastamento} onChange={(e) => setComAfastamento(e.target.checked)} />
              Com afastamento
            </label>
            {comAfastamento && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Dias de afastamento</span>
                <input type="number" min={0} value={diasAfastamento} onChange={(e) => setDiasAfastamento(e.target.value)} className="w-28 rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
            )}
            <label className="flex w-full flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Descrição</span>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Registrar
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
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">eSocial S-2210</th>
            </tr>
          </thead>
          <tbody>
            {accidents?.map((a) => (
              <tr key={a.id} className="cursor-pointer border-b border-divider last:border-0 hover:bg-surface-alt" onClick={() => openDrawer(a.id)}>
                <td className="px-5 py-3 font-medium">{a.employee.nome}</td>
                <td className="px-5 py-3">{TIPO_LABEL[a.tipoAcidente]}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(a.dataAcidente).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td className="px-5 py-3">
                  <Badge tone={a.status === 'ENCERRADA' ? 'green' : 'amber'}>{a.status === 'ENCERRADA' ? 'Encerrada' : 'Em análise'}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={a.esocialSent ? 'green' : 'red'}>{a.esocialSent ? 'Enviado' : 'Pendente'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accidents?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma CAT registrada.</p>}
      </Card>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.employee.nome ?? ''}>
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge tone={detail.status === 'ENCERRADA' ? 'green' : 'amber'}>{detail.status === 'ENCERRADA' ? 'Encerrada' : 'Em análise'}</Badge>
              <span className="text-sm text-text-secondary">{detail.cargo}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-text-tertiary">Data do acidente</div>
                <div>{new Date(detail.dataAcidente).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Emissão da CAT</div>
                <div>{new Date(detail.dataEmissaoCat).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Afastamento</div>
                <div>{detail.comAfastamento ? `${detail.diasAfastamento} dias` : 'Não'}</div>
              </div>
            </div>

            {detail.emissaoAtrasada && (
              <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-xs text-danger">
                ⚠ CAT emitida fora do prazo legal de 1 dia útil.
              </p>
            )}

            {detail.descricao && <p className="text-sm text-text-secondary">{detail.descricao}</p>}

            {!detail.esocialSent && (
              <Button variant="secondary" onClick={() => sendEsocial.mutate(detail.id)} disabled={sendEsocial.isPending}>
                Enviar evento S-2210
              </Button>
            )}

            <div className="border-t border-divider pt-3">
              <h4 className="mb-2 text-sm font-semibold">Investigação</h4>
              <label className="mb-2 flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Causa raiz</span>
                <textarea value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Ação corretiva</span>
                <textarea value={acaoCorretiva} onChange={(e) => setAcaoCorretiva(e.target.value)} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
              <Button variant="secondary" className="mt-2" onClick={() => saveInvestigation.mutate()} disabled={saveInvestigation.isPending}>
                Salvar investigação
              </Button>
            </div>

            {detail.status !== 'ENCERRADA' && (
              <div className="border-t border-divider pt-3">
                <label className="mb-2 flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Nota de encerramento</span>
                  <textarea value={notaEncerramento} onChange={(e) => setNotaEncerramento(e.target.value)} rows={2} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <Button onClick={() => closeAccident.mutate()} disabled={closeAccident.isPending}>
                  Encerrar CAT
                </Button>
              </div>
            )}

            {detail.auditLog.length > 0 && (
              <div className="border-t border-divider pt-3">
                <h4 className="mb-2 text-sm font-semibold text-text-secondary">Trilha de auditoria</h4>
                <ul className="flex flex-col gap-1 text-xs text-text-tertiary">
                  {detail.auditLog.map((e) => (
                    <li key={e.id}>
                      {new Date(e.createdAt).toLocaleString('pt-BR')} — {e.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
