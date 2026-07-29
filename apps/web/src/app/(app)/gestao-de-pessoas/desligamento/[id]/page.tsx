'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate, TERMINATION_STATUS_LABEL, TERMINATION_STATUS_TONE, TERMINATION_TIPO_LABEL, TerminationStatusValue, TerminationTipo } from '@/lib/format';
import { Badge, Button, Card } from '@/components/ui';

interface ChecklistItem {
  key: string;
  nome: string;
  ativo: boolean;
  bloqueante: boolean;
  categoria: 'PROCESSO' | 'COMPLIANCE';
}

interface Readiness {
  ready: boolean;
  pendingBlocking: string[];
  pendingInfo: string[];
}

interface PodeEfetivar {
  ready: boolean;
  pendentes: string[];
}

interface CalculoRescisao {
  saldoSalario: number;
  avisoPrevio: { dias: number; valorIndenizado: number };
  decimoTerceiroProporcional: number;
  ferias: { dias: number; valor: number; tercoConstitucional: number };
  fgts: { saldoConsiderado: number; percentualMulta: number; valorMulta: number };
  totalBruto: number;
  aviso: string;
}

interface TerminationDetail {
  id: string;
  nome: string;
  cargo: string;
  data: string;
  tipo: TerminationTipo;
  status: TerminationStatusValue;
  motivo: string | null;
  docs: Record<string, boolean>;
  esocialSent: boolean;
  esocialEvento: string | null;
  esocialEnviadoEm: string | null;
  esocialProtocolo: string | null;
  termoGerado: boolean;
  cartaGerada: boolean;
  entrevistaMotivo: string | null;
  entrevistaObs: string | null;
  exigeHomologacao: boolean;
  calculoRescisao: CalculoRescisao | null;
  checklist: ChecklistItem[];
  readiness: Readiness;
  podeEfetivar: PodeEfetivar;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function TerminationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [termoText, setTermoText] = useState('');
  const [cartaText, setCartaText] = useState('');
  const [entrevistaMotivo, setEntrevistaMotivo] = useState('');
  const [entrevistaObs, setEntrevistaObs] = useState('');
  const [confirmandoEfetivacao, setConfirmandoEfetivacao] = useState(false);
  const [esocialEvento, setEsocialEvento] = useState('S-2299');
  const [esocialProtocolo, setEsocialProtocolo] = useState('');
  const [carregadoId, setCarregadoId] = useState<string | undefined>(undefined);

  const { data: t } = useQuery({
    queryKey: ['termination', id],
    queryFn: async () => (await api.get<TerminationDetail>(`/rh/terminations/${id}`)).data,
    enabled: !!id,
  });

  // Sincroniza os campos editáveis com o registro carregado — ajuste feito durante a renderização
  // (não em useEffect) porque só precisa rodar quando o id muda, e assim evita um render extra.
  if (t && t.id !== carregadoId) {
    setCarregadoId(t.id);
    setEntrevistaMotivo(t.entrevistaMotivo ?? '');
    setEntrevistaObs(t.entrevistaObs ?? '');
    setEsocialEvento(t.esocialEvento ?? (t.tipo === 'FIM_CONTRATO_EXPERIENCIA' ? 'S-2399' : 'S-2299'));
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['termination', id] });

  const toggleDoc = useMutation({
    mutationFn: async (vars: { key: string; checked: boolean }) => api.patch(`/rh/terminations/${id}/docs`, vars),
    onSuccess: invalidate,
  });
  const calcular = useMutation({
    mutationFn: async () => api.post(`/rh/terminations/${id}/calcular`),
    onSuccess: invalidate,
  });
  const sendEsocial = useMutation({
    mutationFn: async () => api.post(`/rh/terminations/${id}/esocial`, { evento: esocialEvento, protocolo: esocialProtocolo || undefined }),
    onSuccess: invalidate,
  });
  const generateTermo = useMutation({
    mutationFn: async () => (await api.post(`/rh/terminations/${id}/generate-termo`)).data,
    onSuccess: (data: { texto: string }) => {
      setTermoText(data.texto);
      invalidate();
    },
  });
  const generateCarta = useMutation({
    mutationFn: async () => (await api.post(`/rh/terminations/${id}/generate-carta`)).data,
    onSuccess: (data: { texto: string }) => {
      setCartaText(data.texto);
      invalidate();
    },
  });
  const updateStatus = useMutation({
    mutationFn: async (status: TerminationStatusValue) => api.patch(`/rh/terminations/${id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      setConfirmandoEfetivacao(false);
    },
  });
  const saveInterview = useMutation({
    mutationFn: async () => api.patch(`/rh/terminations/${id}/exit-interview`, { entrevistaMotivo, entrevistaObs }),
    onSuccess: invalidate,
  });

  if (!t) return <p className="text-sm text-text-tertiary">Carregando…</p>;

  const prazo10dias = new Date(new Date(t.data).getTime() + 10 * 86_400_000);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/gestao-de-pessoas/desligamento" className="text-sm text-text-secondary hover:text-text">
        ← Voltar para Desligamento
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.nome}</h2>
          <p className="text-sm text-text-secondary">
            {t.cargo} · {TERMINATION_TIPO_LABEL[t.tipo]} · {formatDate(t.data)}
            {t.exigeHomologacao && ' · exige homologação'}
          </p>
        </div>
        <Badge tone={TERMINATION_STATUS_TONE[t.status]}>{TERMINATION_STATUS_LABEL[t.status]}</Badge>
      </div>

      {!['CONCLUIDO', 'CANCELADO'].includes(t.status) && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Checklist</h3>
              {(['PROCESSO', 'COMPLIANCE'] as const).map((categoria) => {
                const itens = t.checklist.filter((c) => c.ativo && c.categoria === categoria);
                if (itens.length === 0) return null;
                return (
                  <div key={categoria} className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">{categoria}</span>
                    {itens.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!t.docs[c.key]}
                          onChange={(e) => toggleDoc.mutate({ key: c.key, checked: e.target.checked })}
                        />
                        {c.nome}
                        {c.bloqueante ? <Badge tone="red">bloqueia conclusão</Badge> : <Badge tone="grey">informativo</Badge>}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Cálculo da rescisão</h3>
          <Button variant="secondary" disabled={calcular.isPending} onClick={() => calcular.mutate()}>
            {t.calculoRescisao ? 'Recalcular' : 'Calcular'}
          </Button>
        </div>
        {t.calculoRescisao && (
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span>Saldo de salário</span>
              <span>{formatBRL(t.calculoRescisao.saldoSalario)}</span>
            </div>
            <div className="flex justify-between">
              <span>Aviso prévio indenizado ({t.calculoRescisao.avisoPrevio.dias} dias)</span>
              <span>{formatBRL(t.calculoRescisao.avisoPrevio.valorIndenizado)}</span>
            </div>
            <div className="flex justify-between">
              <span>13º proporcional</span>
              <span>{formatBRL(t.calculoRescisao.decimoTerceiroProporcional)}</span>
            </div>
            <div className="flex justify-between">
              <span>Férias ({t.calculoRescisao.ferias.dias} dias) + 1/3</span>
              <span>{formatBRL(t.calculoRescisao.ferias.valor + t.calculoRescisao.ferias.tercoConstitucional)}</span>
            </div>
            <div className="flex justify-between">
              <span>Multa FGTS ({(t.calculoRescisao.fgts.percentualMulta * 100).toFixed(0)}%)</span>
              <span>{formatBRL(t.calculoRescisao.fgts.valorMulta)}</span>
            </div>
            <div className="flex justify-between border-t border-divider pt-1.5 font-semibold">
              <span>Total bruto</span>
              <span>{formatBRL(t.calculoRescisao.totalBruto)}</span>
            </div>
            <Badge tone="amber">{t.calculoRescisao.aviso}</Badge>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Evento eSocial</span>
          {t.esocialSent ? (
            <Badge tone="green">
              {t.esocialEvento} enviado{t.esocialEnviadoEm ? ` em ${formatDate(t.esocialEnviadoEm)}` : ''}
            </Badge>
          ) : (
            <span className="text-xs text-text-tertiary">Prazo: {formatDate(prazo10dias.toISOString())}</span>
          )}
        </div>
        {t.esocialProtocolo && <p className="text-xs text-text-tertiary">Protocolo: {t.esocialProtocolo}</p>}
        {!t.esocialSent && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Evento</span>
              <select
                value={esocialEvento}
                onChange={(e) => setEsocialEvento(e.target.value)}
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              >
                <option value="S-2299">S-2299 (desligamento)</option>
                <option value="S-2399">S-2399 (fim de TAC/experiência)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Protocolo (opcional)</span>
              <input
                value={esocialProtocolo}
                onChange={(e) => setEsocialProtocolo(e.target.value)}
                placeholder="Número recebido do contador"
                className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
              />
            </label>
            <Button onClick={() => sendEsocial.mutate()}>Marcar como enviado</Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm">Termo de rescisão</span>
          <Button variant="secondary" onClick={() => generateTermo.mutate()}>
            {t.termoGerado ? 'Ver termo' : 'Gerar termo'}
          </Button>
        </div>
        {termoText && <p className="rounded-[10px] bg-surface-alt p-3 text-xs text-text-secondary">{termoText}</p>}
        <div className="flex items-center justify-between">
          <span className="text-sm">Carta de referência</span>
          <Button variant="secondary" onClick={() => generateCarta.mutate()}>
            {t.cartaGerada ? 'Ver carta' : 'Gerar carta'}
          </Button>
        </div>
        {cartaText && <p className="rounded-[10px] bg-surface-alt p-3 text-xs text-text-secondary">{cartaText}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Entrevista de desligamento</h3>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Motivo relatado</span>
          <input
            value={entrevistaMotivo}
            onChange={(e) => setEntrevistaMotivo(e.target.value)}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Observações</span>
          <textarea
            value={entrevistaObs}
            onChange={(e) => setEntrevistaObs(e.target.value)}
            rows={3}
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2"
          />
        </label>
        <Button variant="secondary" onClick={() => saveInterview.mutate()} className="self-start">
          Salvar
        </Button>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Avançar processo</h3>

        {(t.status === 'EM_ANDAMENTO' || t.status === 'AGUARDANDO_EXAME') && (
          <div className="flex flex-col items-start gap-2">
            <div className="flex gap-2">
              {t.status === 'EM_ANDAMENTO' && (
                <Button variant="secondary" onClick={() => updateStatus.mutate('AGUARDANDO_EXAME')}>
                  Marcar aguardando exame
                </Button>
              )}
              {t.status === 'AGUARDANDO_EXAME' && (
                <Button variant="secondary" onClick={() => updateStatus.mutate('EM_ANDAMENTO')}>
                  Voltar para checklist
                </Button>
              )}
              <Button disabled={!t.podeEfetivar.ready} onClick={() => updateStatus.mutate('PRONTO_PARA_EFETIVAR')}>
                Marcar pronto para efetivar
              </Button>
              <Button variant="danger" onClick={() => updateStatus.mutate('CANCELADO')}>
                Cancelar processo
              </Button>
            </div>
            {!t.podeEfetivar.ready && (
              <p className="text-xs text-text-tertiary">Pendente(s): {t.podeEfetivar.pendentes.join(', ')}</p>
            )}
          </div>
        )}

        {t.status === 'PRONTO_PARA_EFETIVAR' && (
          <div className="flex flex-col items-start gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => updateStatus.mutate('EM_ANDAMENTO')}>
                Voltar para checklist
              </Button>
              {!confirmandoEfetivacao ? (
                <Button onClick={() => setConfirmandoEfetivacao(true)}>Efetivar desligamento</Button>
              ) : (
                <Button variant="danger" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate('EFETIVADO')}>
                  Confirmar efetivação (irreversível)
                </Button>
              )}
              <Button variant="danger" onClick={() => updateStatus.mutate('CANCELADO')}>
                Cancelar processo
              </Button>
            </div>
            {confirmandoEfetivacao && (
              <p className="text-xs text-danger">
                Ao efetivar, o colaborador vira inativo e o processo não pode mais ser cancelado. Confirme só se tiver certeza.
              </p>
            )}
          </div>
        )}

        {t.status === 'EFETIVADO' && (
          <div className="flex gap-2">
            {t.exigeHomologacao && (
              <Button variant="secondary" onClick={() => updateStatus.mutate('EM_HOMOLOGACAO')}>
                Marcar em homologação
              </Button>
            )}
            <Button onClick={() => updateStatus.mutate('CONCLUIDO')}>Concluir processo</Button>
          </div>
        )}

        {t.status === 'EM_HOMOLOGACAO' && <Button onClick={() => updateStatus.mutate('CONCLUIDO')}>Concluir processo</Button>}

        {t.status === 'CONCLUIDO' && <p className="text-sm text-text-tertiary">Processo encerrado.</p>}
        {t.status === 'CANCELADO' && <p className="text-sm text-text-tertiary">Processo cancelado.</p>}
      </Card>
    </div>
  );
}
