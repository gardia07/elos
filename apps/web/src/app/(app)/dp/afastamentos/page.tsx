'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Modal } from '@/components/ui';

interface EmployeeOption {
  id: string;
  nome: string;
}

interface MotivoAfastamento {
  id: string;
  descricao: string;
  natureza: 'OCUPACIONAL' | 'NAO_OCUPACIONAL';
  exigeCid: boolean;
  geraEstabilidade: boolean;
}

interface AfastamentoListItem {
  id: string;
  employeeId: string;
  employee: { nome: string };
  motivoAfastamento: MotivoAfastamento | null;
  tipo: string;
  inicio: string;
  retorno: string | null;
  cid: string | null;
  cidDescricao: string | null;
  diasCorridos: number;
  situacao: 'EM_ANDAMENTO' | 'ENCERRADO';
}

interface EpisodioCalculado {
  diasAcumulados: number;
  diasResponsabilidadeEmpresa: number;
  diasResponsabilidadeInss: number;
  dataLimiteJanela60Dias: string;
  status: 'ABERTO' | 'ENCERRADO';
}

interface ResponsabilidadeAfastamento {
  diasCorridos: number;
  diasResponsabilidadeEmpresa: number;
  diasResponsabilidadeInss: number;
  recaida: boolean;
}

interface AfastamentoDetalhe extends AfastamentoListItem {
  medicoNome: string | null;
  medicoCrm: string | null;
  episodio: EpisodioCalculado | null;
  responsabilidade: ResponsabilidadeAfastamento | null;
  estabilidadeAte: string | null;
}

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

const NATUREZA_TONE: Record<MotivoAfastamento['natureza'], 'red' | 'blue'> = {
  OCUPACIONAL: 'red',
  NAO_OCUPACIONAL: 'blue',
};

export default function AfastamentosPage() {
  const queryClient = useQueryClient();
  const [showCriar, setShowCriar] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [retornoId, setRetornoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'recaida'; texto: string } | null>(null);

  const { data: afastamentos } = useQuery({
    queryKey: ['dp', 'afastamentos'],
    queryFn: async () => (await api.get<AfastamentoListItem[]>('/dp/afastamentos')).data,
  });

  const { data: motivos } = useQuery({
    queryKey: ['dp', 'afastamentos', 'motivos'],
    queryFn: async () => (await api.get<MotivoAfastamento[]>('/dp/afastamentos/motivos')).data,
  });

  const { data: employees } = useQuery({
    queryKey: ['rh', 'employees', 'all'],
    queryFn: async () => (await api.get<EmployeeOption[]>('/rh/employees')).data,
    enabled: showCriar,
  });

  const { data: detalhe } = useQuery({
    queryKey: ['dp', 'afastamentos', detalheId],
    queryFn: async () => (await api.get<AfastamentoDetalhe>(`/dp/afastamentos/${detalheId}`)).data,
    enabled: !!detalheId,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Lançamento de afastamentos, com soma automática por mesmo CID dentro de 60 dias (Lei 8.213/91, art. 60 §3º).
        </p>
        <Button variant="add" onClick={() => setShowCriar(true)} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Registrar afastamento
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-wide text-text-tertiary">
                <th className="py-2 pr-3">Colaborador</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="py-2 pr-3">Início</th>
                <th className="py-2 pr-3">Dias</th>
                <th className="py-2 pr-3">Situação</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {afastamentos?.map((a) => (
                <tr key={a.id} className="border-b border-divider last:border-0">
                  <td className="py-2 pr-3">
                    <button className="text-left hover:text-accent" onClick={() => setDetalheId(a.id)}>
                      {a.employee.nome}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    {a.motivoAfastamento ? (
                      <Badge tone={NATUREZA_TONE[a.motivoAfastamento.natureza]}>{a.motivoAfastamento.descricao}</Badge>
                    ) : (
                      a.tipo
                    )}
                  </td>
                  <td className="py-2 pr-3">{formatDate(a.inicio)}</td>
                  <td className="py-2 pr-3">{a.diasCorridos}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={a.situacao === 'EM_ANDAMENTO' ? 'amber' : 'green'}>
                      {a.situacao === 'EM_ANDAMENTO' ? 'Em andamento' : 'Encerrado'}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {a.situacao === 'EM_ANDAMENTO' && (
                      <Button variant="secondary" onClick={() => setRetornoId(a.id)}>
                        Registrar retorno
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {afastamentos?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-text-tertiary">
                    Nenhum afastamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCriar && (
        <CriarAfastamentoModal
          employees={employees ?? []}
          motivos={motivos ?? []}
          onClose={() => setShowCriar(false)}
          onCreated={(responsabilidade) => {
            setShowCriar(false);
            queryClient.invalidateQueries({ queryKey: ['dp', 'afastamentos'] });
            if (responsabilidade.recaida) {
              setAviso({
                tipo: 'recaida',
                texto: `Recaída pelo mesmo CID dentro de 60 dias — este afastamento entra na cadeia já em andamento (${responsabilidade.diasResponsabilidadeInss} de ${responsabilidade.diasCorridos} dia(s) já nascem como responsabilidade do INSS). Comunique expressamente ao INSS que se trata do mesmo motivo (infoMesmoMtv, art. 75 Decreto 3.048/99).`,
              });
            }
          }}
        />
      )}

      {aviso && (
        <Modal open onClose={() => setAviso(null)} title="Recaída — mesmo motivo">
          <p className="mb-4 text-sm text-text-secondary">{aviso.texto}</p>
          <Button onClick={() => setAviso(null)}>Entendi</Button>
        </Modal>
      )}

      {retornoId && (
        <RegistrarRetornoModal
          id={retornoId}
          onClose={() => setRetornoId(null)}
          onDone={() => {
            setRetornoId(null);
            queryClient.invalidateQueries({ queryKey: ['dp', 'afastamentos'] });
          }}
        />
      )}

      {detalheId && detalhe && (
        <Modal open onClose={() => setDetalheId(null)} title={detalhe.employee.nome}>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <span className="text-text-tertiary">Motivo: </span>
              {detalhe.motivoAfastamento?.descricao ?? detalhe.tipo}
            </div>
            <div>
              <span className="text-text-tertiary">Período: </span>
              {formatDate(detalhe.inicio)} {detalhe.retorno ? `a ${formatDate(detalhe.retorno)}` : '(em andamento)'} — {detalhe.diasCorridos} dia(s)
            </div>
            {detalhe.cid !== null && (
              <div>
                <span className="text-text-tertiary">CID: </span>
                {detalhe.cid} {detalhe.cidDescricao && `— ${detalhe.cidDescricao}`}
              </div>
            )}
            {detalhe.cid === null && detalhe.motivoAfastamento?.exigeCid && (
              <p className="text-xs text-text-tertiary">CID restrito a perfis autorizados.</p>
            )}
            {(detalhe.medicoNome || detalhe.medicoCrm) && (
              <div>
                <span className="text-text-tertiary">Médico: </span>
                {detalhe.medicoNome} {detalhe.medicoCrm && `(CRM ${detalhe.medicoCrm})`}
              </div>
            )}

            {detalhe.episodio && (
              <div className="rounded-container border border-border-strong bg-surface-alt p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Episódio (mesmo CID, janela de 60 dias)</p>
                <p>Dias acumulados na cadeia: {detalhe.episodio.diasAcumulados}</p>
                <p>Responsabilidade empresa (acumulado): {detalhe.episodio.diasResponsabilidadeEmpresa} dia(s)</p>
                <p>Responsabilidade INSS (acumulado): {detalhe.episodio.diasResponsabilidadeInss} dia(s)</p>
                {detalhe.responsabilidade && (
                  <p className="mt-2 border-t border-divider pt-2">
                    Deste afastamento: {detalhe.responsabilidade.diasResponsabilidadeEmpresa} dia(s) empresa / {detalhe.responsabilidade.diasResponsabilidadeInss} dia(s) INSS
                    {detalhe.responsabilidade.recaida && ' (recaída — já havia acumulado na cadeia)'}
                  </p>
                )}
              </div>
            )}

            {detalhe.estabilidadeAte && (
              <div className="rounded-container border border-warning-bg bg-warning-bg p-3 text-warning">
                Estabilidade acidentária vigente até {formatDate(detalhe.estabilidadeAte)} (Lei 8.213/91, art. 118).
              </div>
            )}

            <AnexarAtestado employeeId={detalhe.employeeId} leaveRecordId={detalhe.id} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function CriarAfastamentoModal({
  employees,
  motivos,
  onClose,
  onCreated,
}: {
  employees: EmployeeOption[];
  motivos: MotivoAfastamento[];
  onClose: () => void;
  onCreated: (responsabilidade: ResponsabilidadeAfastamento) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [motivoAfastamentoId, setMotivoAfastamentoId] = useState('');
  const [inicio, setInicio] = useState('');
  const [dataFimPrevista, setDataFimPrevista] = useState('');
  const [cid, setCid] = useState('');
  const [cidDescricao, setCidDescricao] = useState('');
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoCrm, setMedicoCrm] = useState('');
  const [erro, setErro] = useState('');

  const motivo = motivos.find((m) => m.id === motivoAfastamentoId);

  const criar = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ responsabilidade: ResponsabilidadeAfastamento }>('/dp/afastamentos', {
          employeeId,
          motivoAfastamentoId,
          inicio,
          dataFimPrevista: dataFimPrevista || undefined,
          cid: cid || undefined,
          cidDescricao: cidDescricao || undefined,
          medicoNome: medicoNome || undefined,
          medicoCrm: medicoCrm || undefined,
        })
      ).data,
    onSuccess: (data) => onCreated(data.responsabilidade),
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErro(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível registrar o afastamento.');
    },
  });

  return (
    <Modal open onClose={onClose} title="Registrar afastamento">
      <form
        className="flex flex-col gap-3 text-sm"
        onSubmit={(ev) => {
          ev.preventDefault();
          criar.mutate();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary">Colaborador</span>
          <select required value={employeeId} onChange={(ev) => setEmployeeId(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2">
            <option value="">Selecione</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary">Motivo</span>
          <select required value={motivoAfastamentoId} onChange={(ev) => setMotivoAfastamentoId(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2">
            <option value="">Selecione</option>
            {motivos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.descricao}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary">Início</span>
          <input required type="date" value={inicio} onChange={(ev) => setInicio(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary">Retorno previsto (conforme atestado)</span>
          <input type="date" value={dataFimPrevista} onChange={(ev) => setDataFimPrevista(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
        </label>

        {motivo?.exigeCid && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-text-secondary">CID</span>
              <input required value={cid} onChange={(ev) => setCid(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-text-secondary">Descrição (opcional)</span>
              <input value={cidDescricao} onChange={(ev) => setCidDescricao(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-text-secondary">Médico</span>
              <input value={medicoNome} onChange={(ev) => setMedicoNome(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-text-secondary">CRM</span>
              <input value={medicoCrm} onChange={(ev) => setMedicoCrm(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>
          </>
        )}

        {erro && <p className="text-xs text-danger">{erro}</p>}

        <div className="mt-2 flex gap-2">
          <Button type="submit" disabled={criar.isPending}>
            Registrar
          </Button>
          <Button type="button" variant="cancel" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RegistrarRetornoModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [retorno, setRetorno] = useState('');
  const registrar = useMutation({
    mutationFn: async () => api.post(`/dp/afastamentos/${id}/retorno`, { retorno }),
    onSuccess: onDone,
  });

  return (
    <Modal open onClose={onClose} title="Registrar retorno">
      <form
        className="flex flex-col gap-3 text-sm"
        onSubmit={(ev) => {
          ev.preventDefault();
          registrar.mutate();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary">Data do retorno</span>
          <input required type="date" value={retorno} onChange={(ev) => setRetorno(ev.target.value)} className="rounded-control border border-border-strong bg-surface px-3 py-2" />
        </label>
        <div className="mt-2 flex gap-2">
          <Button type="submit" disabled={registrar.isPending}>
            Confirmar
          </Button>
          <Button type="button" variant="cancel" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AnexarAtestado({ employeeId, leaveRecordId }: { employeeId: string; leaveRecordId: string }) {
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('arquivo', file);
      form.append('tipo', 'Atestado/Afastamento');
      form.append('leaveRecordId', leaveRecordId);
      return api.post(`/rh/employees/${employeeId}/documentos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => setOk(true),
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErro(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.');
    },
  });

  return (
    <label className="flex flex-col gap-1.5 border-t border-divider pt-3">
      <span className="text-text-secondary">Anexar atestado</span>
      <input
        type="file"
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          if (file) upload.mutate(file);
        }}
      />
      {ok && <span className="text-xs text-success">Anexado.</span>}
      {erro && <span className="text-xs text-danger">{erro}</span>}
    </label>
  );
}
