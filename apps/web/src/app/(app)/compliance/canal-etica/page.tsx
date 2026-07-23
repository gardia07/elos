'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Drawer } from '@/components/ui';

interface EthicsCase {
  id: string;
  protocolo: string;
  categoria: 'ASSEDIO' | 'DISCRIMINACAO' | 'FRAUDE' | 'CONFLITO_INTERESSE' | 'OUTRO';
  descricao: string;
  anonimo: boolean;
  denuncianteNome: string | null;
  status: 'ABERTO' | 'EM_INVESTIGACAO' | 'CONCLUIDO';
  conclusao: string | null;
  createdAt: string;
}

interface EthicsCaseDetail extends EthicsCase {
  auditLog: { id: string; action: string; createdAt: string }[];
}

const CATEGORIA_LABEL = {
  ASSEDIO: 'Assédio',
  DISCRIMINACAO: 'Discriminação',
  FRAUDE: 'Fraude',
  CONFLITO_INTERESSE: 'Conflito de interesse',
  OUTRO: 'Outro',
} as const;

const STATUS_LABEL = { ABERTO: 'Aberto', EM_INVESTIGACAO: 'Em investigação', CONCLUIDO: 'Concluído' } as const;
const STATUS_TONE = { ABERTO: 'red', EM_INVESTIGACAO: 'amber', CONCLUIDO: 'green' } as const;

export default function CanalEticaPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<EthicsCase['categoria']>('OUTRO');
  const [descricao, setDescricao] = useState('');
  const [anonimo, setAnonimo] = useState(true);
  const [denuncianteNome, setDenuncianteNome] = useState('');
  const [conclusao, setConclusao] = useState('');

  const { data: cases } = useQuery({
    queryKey: ['compliance', 'ethics-cases'],
    queryFn: async () => (await api.get<EthicsCase[]>('/compliance/ethics-cases')).data,
  });

  const { data: detail } = useQuery({
    queryKey: ['compliance', 'ethics-cases', openId],
    queryFn: async () => (await api.get<EthicsCaseDetail>(`/compliance/ethics-cases/${openId}`)).data,
    enabled: !!openId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['compliance', 'ethics-cases'] });
    queryClient.invalidateQueries({ queryKey: ['compliance', 'overview'] });
  };

  const create = useMutation({
    mutationFn: async () => api.post('/compliance/ethics-cases', { categoria, descricao, anonimo, denuncianteNome: anonimo ? undefined : denuncianteNome }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setDescricao('');
      setDenuncianteNome('');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: EthicsCase['status']) => api.patch(`/compliance/ethics-cases/${openId}/status`, { status, conclusao: conclusao || undefined }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['compliance', 'ethics-cases', openId] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : 'Abrir novo caso'}</Button>
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
              <span className="text-text-secondary">Categoria</span>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value as EthicsCase['categoria'])} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2">
                {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="flex w-full flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Descrição do relato</span>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} required className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} />
              Denúncia anônima
            </label>
            {!anonimo && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Nome do denunciante</span>
                <input value={denuncianteNome} onChange={(e) => setDenuncianteNome(e.target.value)} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
              </label>
            )}
            <Button type="submit" disabled={create.isPending}>
              Registrar caso
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Protocolo</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Aberto em</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases?.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b border-divider last:border-0 hover:bg-surface-alt" onClick={() => { setOpenId(c.id); setConclusao(''); }}>
                <td className="px-5 py-3 font-medium">{c.protocolo}</td>
                <td className="px-5 py-3">{CATEGORIA_LABEL[c.categoria]}</td>
                <td className="px-5 py-3 text-text-secondary">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cases?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhum caso registrado.</p>}
      </Card>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.protocolo ?? ''}>
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
              <span className="text-sm text-text-secondary">{CATEGORIA_LABEL[detail.categoria]}</span>
            </div>
            <p className="text-sm">{detail.descricao}</p>
            <div className="text-sm text-text-secondary">
              {detail.anonimo ? 'Denúncia anônima' : `Denunciante: ${detail.denuncianteNome ?? '—'}`}
            </div>

            {detail.status !== 'CONCLUIDO' && (
              <div className="flex flex-col gap-2 border-t border-divider pt-3">
                {detail.status === 'ABERTO' && (
                  <Button variant="secondary" className="self-start" onClick={() => updateStatus.mutate('EM_INVESTIGACAO')} disabled={updateStatus.isPending}>
                    Iniciar investigação
                  </Button>
                )}
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Conclusão</span>
                  <textarea value={conclusao} onChange={(e) => setConclusao(e.target.value)} rows={3} className="rounded-[10px] border border-border-strong bg-surface px-3 py-2" />
                </label>
                <Button className="self-start" onClick={() => updateStatus.mutate('CONCLUIDO')} disabled={updateStatus.isPending}>
                  Encerrar caso
                </Button>
              </div>
            )}
            {detail.conclusao && (
              <div className="rounded-[10px] bg-surface-alt p-3 text-sm">
                <div className="text-xs text-text-tertiary">Conclusão</div>
                {detail.conclusao}
              </div>
            )}

            {detail.auditLog.length > 0 && (
              <div className="border-t border-divider pt-3">
                <h4 className="mb-2 text-sm font-semibold text-text-secondary">Trilha de auditoria</h4>
                <ul className="flex flex-col gap-1 text-xs text-text-tertiary">
                  {detail.auditLog.map((e) => (
                    <li key={e.id}>{new Date(e.createdAt).toLocaleString('pt-BR')} — {e.action}</li>
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
