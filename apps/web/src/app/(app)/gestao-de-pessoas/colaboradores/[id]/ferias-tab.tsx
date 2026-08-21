'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDate, formatDias } from '@/lib/format';
import { Badge, Button, Card, Modal } from '@/components/ui';
import {
  FeriasHistoricoColaborador,
  STATUS_FRACAO_LABEL,
  STATUS_PERIODO_LABEL,
  StatusFracaoFerias,
  StatusPeriodoAquisitivo,
} from './page';

// Espelha AVISO_REGRAS.antecedenciaMinDias (apps/api/src/rh/ferias/regras-ferias.util.ts) --
// só pra feedback de UI em tempo real (obrigatoriedade da Justificativa); a trava de
// verdade continua no backend (previewAlertas/programar), então um eventual desalinho
// aqui não abre brecha nenhuma, só deixa o hint um pouco impreciso.
const JANELA_AVISO_DIAS = 30;
const FRACAO_MIN_DIAS_UMA = 14;

type PeriodoHist = FeriasHistoricoColaborador['periodos'][number];

function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Tom local pra esta aba -- cobre "Em aquisição"/"A vencer" com coral (atenção) em vez do amber
 * compartilhado (STATUS_PERIODO_TONE em page.tsx), que outras telas (Registro de Empregado) continuam usando. */
function corDoStatusPeriodo(status: StatusPeriodoAquisitivo): 'green' | 'blue' | 'coral' | 'red' | 'grey' {
  switch (status) {
    case 'QUITADA':
    case 'DISPONIVEL':
      return 'green';
    case 'PARCIALMENTE_GOZADA':
      return 'blue';
    case 'EM_AQUISICAO':
    case 'A_VENCER':
      return 'coral';
    case 'VENCIDA':
    case 'PERDIDO_POR_AFASTAMENTO':
      return 'red';
    default:
      return 'grey';
  }
}

const TONE_FILL: Record<'green' | 'blue' | 'coral' | 'red' | 'grey', string> = {
  green: 'bg-success',
  blue: 'bg-accent',
  coral: 'bg-info',
  red: 'bg-danger',
  grey: 'bg-text-tertiary',
};

type VencimentoEstado = 'calmo' | 'atencao' | 'urgente';

function estadoVencimento(diasParaVencer: number | null): VencimentoEstado | null {
  if (diasParaVencer == null) return null;
  if (diasParaVencer > 120) return 'calmo';
  if (diasParaVencer >= 30) return 'atencao';
  return 'urgente';
}

const VENCIMENTO_TONE: Record<VencimentoEstado, 'green' | 'coral' | 'red'> = {
  calmo: 'green',
  atencao: 'coral',
  urgente: 'red',
};
const VENCIMENTO_LABEL: Record<VencimentoEstado, string> = {
  calmo: 'tranquilo',
  atencao: 'atenção',
  urgente: 'urgente',
};

interface ChecklistItem {
  label: string;
  done: boolean;
  tag: 'prazo' | 'documento' | null;
  peso: number;
}

/** "Conformidade de férias" -- métrica nova, não existe em backend nenhum: pondera dados
 * bancários + aviso/recibo de cada fração ativa. Fração futura sem documento = aviso
 * pendente (peso 2, mais arriscado juridicamente); fração passada sem documento = recibo
 * pendente (peso 1). Diferente do mockup de referência (que só ilustra uma amostra), lista
 * todos os itens reais -- é o que a pontuação de fato pondera, então precisa ser auditável. */
function calcularConformidade(
  periodos: PeriodoHist[],
  banco: { banco: string | null; agencia: string | null; conta: string | null },
  hoje: Date,
): { pontuacao: number; itens: ChecklistItem[] } {
  const itens: ChecklistItem[] = [];
  const bancoOk = !!(banco.banco && banco.agencia && banco.conta);
  itens.push({ label: 'Dados bancários atualizados', done: bancoOk, tag: bancoOk ? null : 'documento', peso: 1 });

  for (const p of periodos) {
    for (const f of p.fracoes) {
      if (f.status === 'REPROVADA' || f.status === 'CANCELADA') continue;
      const futura = new Date(f.dataInicio) > hoje;
      const temDoc = f.documentos.length > 0;
      const faixa = `${formatDate(f.dataInicio)} a ${formatDate(f.dataFim)}`;
      if (futura) {
        itens.push({ label: `Aviso de férias ${temDoc ? 'enviado' : 'pendente'} — fração ${faixa}`, done: temDoc, tag: temDoc ? null : 'prazo', peso: 2 });
      } else {
        itens.push({ label: `Recibo ${temDoc ? 'anexado' : 'pendente'} — fração ${faixa}`, done: temDoc, tag: temDoc ? null : 'documento', peso: 1 });
      }
    }
  }

  itens.sort((a, b) => Number(a.done) - Number(b.done));
  const totalPeso = itens.reduce((s, i) => s + i.peso, 0) || 1;
  const pesoFeito = itens.filter((i) => i.done).reduce((s, i) => s + i.peso, 0);
  return { pontuacao: Math.round((pesoFeito / totalPeso) * 100), itens };
}

interface FeriasTabProps {
  employeeId: string;
  employee: { nome: string; banco: string | null; agencia: string | null; conta: string | null };
  feriasHistorico: FeriasHistoricoColaborador | undefined;
  feriasSaldoAtual: { saldoDisponivel: number; proximoVencimento: string | null; feriasVencendoEm60Dias: boolean } | undefined;
  apiBaseUrl: string;
  onMutated: () => void;
}

export function FeriasTab({ employeeId, employee, feriasHistorico, feriasSaldoAtual, apiBaseUrl, onMutated }: FeriasTabProps) {
  const queryClient = useQueryClient();
  // Meia-noite UTC de hoje -- datas de férias são date-only (sem hora), então comparar
  // contra um "agora" com hora local desalinha a contagem de dias pra quem está a oeste
  // de UTC (todo o Brasil), mesma pegadinha documentada em lib/format.ts::formatDate.
  const hoje = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const periodos = feriasHistorico?.periodos ?? [];

  const [showConformidade, setShowConformidade] = useState(false);
  const [openPeriodo, setOpenPeriodo] = useState<string | null>(null);
  const [openFracao, setOpenFracao] = useState<string | null>(null);

  const [progPeriodoId, setProgPeriodoId] = useState('');
  const [progInicio, setProgInicio] = useState('');
  const [progDias, setProgDias] = useState('');
  const [progDiasAbono, setProgDiasAbono] = useState('');
  const [progAntecipa13, setProgAntecipa13] = useState(false);
  const [progHistorico, setProgHistorico] = useState(false);
  const [progJustificativa, setProgJustificativa] = useState('');
  const [programarError, setProgramarError] = useState('');

  const [uploadingFracaoId, setUploadingFracaoId] = useState<string | null>(null);
  const [uploadFracaoError, setUploadFracaoError] = useState<{ fracaoId: string; message: string } | null>(null);

  // ---- resumo ----
  const periodoEmAquisicao = periodos.find((p) => p.resumo.status === 'EM_AQUISICAO') ?? null;
  const disponivelAgora = feriasSaldoAtual?.saldoDisponivel ?? 0;
  const emFormacao = periodoEmAquisicao?.resumo.saldoDisponivel ?? 0;

  const proximoVencimento = feriasSaldoAtual?.proximoVencimento ?? null;
  const diasParaVencer = proximoVencimento ? Math.round((new Date(proximoVencimento).getTime() - hoje.getTime()) / 86_400_000) : null;
  const estadoVenc = estadoVencimento(diasParaVencer);

  const conformidade = calcularConformidade(periodos, employee, hoje);

  // ---- período selecionado no form ----
  const periodoSelecionado = periodos.find((p) => p.id === progPeriodoId) ?? null;
  const fracoesAtivasDoPeriodo = (periodoSelecionado?.fracoes ?? []).filter((f) => f.status !== 'REPROVADA' && f.status !== 'CANCELADA');
  const fracaoQueSatisfaz14 = fracoesAtivasDoPeriodo.find((f) => f.dias >= FRACAO_MIN_DIAS_UMA);
  const diasDigitados = Number(progDias) || 0;
  const exigencia14Satisfeita = !!fracaoQueSatisfaz14 || diasDigitados >= FRACAO_MIN_DIAS_UMA;

  const diasAntecedencia = progInicio ? Math.round((new Date(progInicio).getTime() - hoje.getTime()) / 86_400_000) : null;
  const foraDaJanelaDeAviso = !progHistorico && diasAntecedencia != null && diasAntecedencia < JANELA_AVISO_DIAS;
  const justificativaObrigatoria = foraDaJanelaDeAviso;

  const debInicio = useDebounced(progInicio);
  const debDias = useDebounced(progDias);
  const debAbono = useDebounced(progDiasAbono);

  const { data: preview } = useQuery({
    queryKey: ['rh', 'ferias', 'preview', progPeriodoId, debInicio, debDias, debAbono, progHistorico],
    queryFn: async () =>
      (
        await api.get<{ alertas: string[]; saldoDisponivel: number }>(`/rh/ferias/periodos/${progPeriodoId}/preview-alertas`, {
          params: { dataInicio: debInicio || undefined, dias: debDias || undefined, diasAbono: debAbono || undefined, historico: progHistorico || undefined },
        })
      ).data,
    enabled: !!progPeriodoId,
  });

  // ---- mutações ----
  const invalidateFerias = () => {
    queryClient.invalidateQueries({ queryKey: ['rh', 'ferias'] });
    onMutated();
  };

  const programarFerias = useMutation({
    mutationFn: async () =>
      api.post(`/rh/ferias/colaboradores/${employeeId}/programar`, {
        periodoAquisitivoId: progPeriodoId,
        dataInicio: progInicio,
        dias: Number(progDias),
        diasAbono: progDiasAbono ? Number(progDiasAbono) : undefined,
        antecipa13: progAntecipa13 || undefined,
        justificativa: progJustificativa || undefined,
        historico: progHistorico || undefined,
      }),
    onSuccess: () => {
      invalidateFerias();
      setProgInicio('');
      setProgDias('');
      setProgDiasAbono('');
      setProgAntecipa13(false);
      setProgHistorico(false);
      setProgJustificativa('');
      setProgramarError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setProgramarError(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível programar as férias.');
    },
  });

  const aprovarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.patch(`/rh/ferias/fracoes/${fracaoId}/aprovar`),
    onSuccess: invalidateFerias,
  });
  const reprovarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.patch(`/rh/ferias/fracoes/${fracaoId}/reprovar`, {}),
    onSuccess: invalidateFerias,
  });
  const cancelarFracao = useMutation({
    mutationFn: async (fracaoId: string) => api.delete(`/rh/ferias/fracoes/${fracaoId}`),
    onSuccess: invalidateFerias,
  });
  const addFracaoDocumento = useMutation({
    mutationFn: async (vars: { fracaoId: string; file: File; rotulo: string }) => {
      const form = new FormData();
      form.append('arquivo', vars.file);
      form.append('tipo', vars.rotulo);
      form.append('fracaoDeFeriasId', vars.fracaoId);
      return api.post(`/rh/employees/${employeeId}/documentos`, form);
    },
    onSuccess: () => {
      invalidateFerias();
      setUploadingFracaoId(null);
      setUploadFracaoError(null);
    },
    onError: (err: unknown, vars) => {
      setUploadingFracaoId(null);
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setUploadFracaoError({ fracaoId: vars.fracaoId, message: Array.isArray(message) ? message.join(' ') : message || 'Não foi possível anexar o arquivo.' });
    },
  });

  // ---- histórico (todas as frações, mais recente primeiro) ----
  const periodoAtual = periodos.length ? [...periodos].sort((a, b) => b.numero - a.numero)[0] : null;
  const diasProgramadosPeriodoAtual = (periodoAtual?.fracoes ?? [])
    .filter((f) => f.status !== 'REPROVADA' && f.status !== 'CANCELADA')
    .reduce((s, f) => s + f.dias + f.diasAbono, 0);
  const totalPeriodoAtual = periodoAtual?.resumo.diasAdquiridos ?? 0;
  const pctProgramado = totalPeriodoAtual > 0 ? Math.min(100, Math.round((diasProgramadosPeriodoAtual / totalPeriodoAtual) * 100)) : 0;

  const todasAsFracoes = periodos
    .flatMap((p) => p.fracoes.map((f) => ({ ...f, periodo: p })))
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

  return (
    <div className="flex flex-col gap-6">
      {/* ---- 4 cards de resumo ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Disponível para uso agora</p>
          <p className="mt-2 text-2xl font-semibold text-text">{formatDias(disponivelAgora)}</p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {disponivelAgora > 0
              ? `Somando os períodos já disponíveis para uso, além do período atual.`
              : periodoEmAquisicao
                ? `Nenhum saldo livre em períodos já quitados. Os ${formatDias(emFormacao)} do período atual ainda não podem ser usados.`
                : 'Nenhum saldo disponível no momento.'}
          </p>
        </Card>

        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Em formação (ainda não disponível)</p>
          <p className="mt-2 text-2xl font-semibold text-text">{formatDias(emFormacao)}</p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {periodoEmAquisicao
              ? `Período ${formatDate(periodoEmAquisicao.dataInicio)} – ${formatDate(periodoEmAquisicao.dataFim)}, em aquisição. Fica utilizável a partir de ${formatDate(periodoEmAquisicao.dataFim)}.`
              : 'Nenhum período em aquisição no momento.'}
          </p>
        </Card>

        <Card>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Próximo vencimento</p>
          <p className="mt-2 text-2xl font-semibold text-text">{proximoVencimento ? formatDate(proximoVencimento) : '—'}</p>
          {estadoVenc && (
            <span className="mt-2 inline-flex">
              <Badge tone={VENCIMENTO_TONE[estadoVenc]}>
                {diasParaVencer} dia(s) restantes · {VENCIMENTO_LABEL[estadoVenc]}
              </Badge>
            </span>
          )}
          {estadoVenc === 'urgente' && <p className="mt-2 text-xs font-medium text-danger">Risco de pagamento em dobro se não programado (CLT, art. 137).</p>}
        </Card>

        <Card className="cursor-pointer transition hover:border-accent" onClick={() => setShowConformidade(true)}>
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">Conformidade de férias</p>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-text-tertiary" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-text">{conformidade.pontuacao}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-info" style={{ width: `${conformidade.pontuacao}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-accent">{conformidade.itens.filter((i) => !i.done).length} pendência(s) · ver detalhes</p>
        </Card>
      </div>

      {/* ---- accordion de períodos ---- */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-text">Períodos aquisitivos</h3>
        <p className="mb-3 text-xs text-text-tertiary">Cada período pode ser expandido para ver adquiridos, gozados, vendidos e prazo de vencimento.</p>
        <div className="flex flex-col gap-2.5">
          {periodos.map((p) => {
            const open = openPeriodo === p.id;
            const tone = corDoStatusPeriodo(p.resumo.status);
            const consumido = p.resumo.diasAdquiridos > 0 ? Math.min(100, Math.round(((p.resumo.diasGozados + p.resumo.diasVendidos) / p.resumo.diasAdquiridos) * 100)) : 0;
            return (
              <div key={p.id} className="overflow-hidden rounded-container border border-border bg-surface">
                <button type="button" onClick={() => setOpenPeriodo(open ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform', !open && '-rotate-90')} />
                  <span className="w-56 shrink-0 text-sm font-semibold text-text">
                    {formatDate(p.dataInicio)} a {formatDate(p.dataFim)}
                  </span>
                  <span className="flex flex-1 items-center gap-3">
                    <Badge tone={tone}>{STATUS_PERIODO_LABEL[p.resumo.status]}</Badge>
                    <span className="hidden h-1.5 max-w-[140px] flex-1 overflow-hidden rounded-full bg-surface-alt sm:block">
                      <span className={cn('block h-full rounded-full', TONE_FILL[tone])} style={{ width: `${consumido}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-text-tertiary">Saldo: {formatDias(p.resumo.saldoDisponivel)}</span>
                </button>
                {open && (
                  <div className="flex flex-wrap items-start gap-8 border-t border-divider bg-surface-alt/50 px-4 py-4 pl-12">
                    <Stat label="Data limite" value={formatDate(p.resumo.dataLimiteConcessao)} />
                    <Stat label="Adquiridos" value={p.resumo.diasAdquiridos} />
                    <Stat label="Gozados" value={p.resumo.diasGozados} />
                    <Stat label="Vendidos" value={p.resumo.diasVendidos} />
                    <Stat label="Saldo" value={p.resumo.saldoDisponivel} />
                    {p.resumo.status === 'EM_AQUISICAO' && (
                      <p className="ml-auto max-w-[340px] rounded-container bg-info-bg px-3 py-2.5 text-xs leading-relaxed text-info">
                        Ainda em aquisição — só poderá ser programado integralmente após {formatDate(p.dataFim)}. Já é possível reservar frações antecipadas.
                      </p>
                    )}
                    {(p.resumo.status === 'VENCIDA' || p.resumo.status === 'A_VENCER') && p.resumo.diasParaVencer != null && (
                      <p className={cn('ml-auto max-w-[340px] rounded-container px-3 py-2.5 text-xs leading-relaxed', p.resumo.status === 'VENCIDA' ? 'bg-danger/10 text-danger' : 'bg-info-bg text-info')}>
                        {p.resumo.diasParaVencer < 0
                          ? `Vencida há ${Math.abs(p.resumo.diasParaVencer)} dia(s) — pagamento em dobro do trecho vencido (art. 137 CLT) se ainda não concedido.`
                          : `Vence em ${p.resumo.diasParaVencer} dia(s).`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {periodos.length === 0 && <p className="py-6 text-center text-sm text-text-tertiary">Sem períodos aquisitivos.</p>}
        </div>
      </div>

      {/* ---- form programar férias ---- */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text">Programar férias</h3>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            programarFerias.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Período aquisitivo</span>
              <select
                value={progPeriodoId}
                onChange={(ev) => setProgPeriodoId(ev.target.value)}
                required
                className="w-full rounded-control border border-border-strong bg-surface px-3 py-2"
              >
                <option value="">Selecione…</option>
                {periodos
                  .filter((p) => p.resumo.saldoDisponivel > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.dataInicio)} a {formatDate(p.dataFim)}
                      {p.resumo.status === 'EM_AQUISICAO' ? ' (Em aquisição)' : ''}
                    </option>
                  ))}
              </select>
              {periodoSelecionado && <span className="text-xs font-medium text-accent">Saldo disponível neste período: {formatDias(periodoSelecionado.resumo.saldoDisponivel)}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Início</span>
              <input type="date" value={progInicio} onChange={(ev) => setProgInicio(ev.target.value)} required className="w-full rounded-control border border-border-strong bg-surface px-3 py-2" />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Dias de gozo</span>
              <input type="number" min={1} value={progDias} onChange={(ev) => setProgDias(ev.target.value)} required className="w-full rounded-control border border-border-strong bg-surface px-3 py-2" />
              <span className="text-[11.5px] text-text-tertiary">Mínimo 5 dias por fração.</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">Dias de abono pecuniário</span>
              <input type="number" min={0} max={10} value={progDiasAbono} onChange={(ev) => setProgDiasAbono(ev.target.value)} placeholder="0" className="w-full rounded-control border border-border-strong bg-surface px-3 py-2" />
              <span className="text-[11.5px] text-text-tertiary">Opcional, máx. 10 dias.</span>
            </label>
          </div>

          {progPeriodoId && exigencia14Satisfeita && (
            <p className="mt-4 flex items-start gap-1.5 text-xs font-medium text-success">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fracaoQueSatisfaz14
                ? `A fração de ${formatDate(fracaoQueSatisfaz14.dataInicio)} a ${formatDate(fracaoQueSatisfaz14.dataFim)} já atende à exigência de pelo menos 14 dias corridos.`
                : 'Esta fração atende à exigência de pelo menos 14 dias corridos.'}
            </p>
          )}

          {preview && preview.alertas.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {preview.alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs font-medium text-danger">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-divider pt-4 text-sm">
            <input id="progAntecipa13" type="checkbox" checked={progAntecipa13} onChange={(ev) => setProgAntecipa13(ev.target.checked)} />
            <label htmlFor="progAntecipa13" className="text-text-secondary">
              Antecipar 1ª parcela do 13º salário
            </label>
          </div>

          <div className="mt-4 rounded-container border border-info-bg bg-info-bg p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <input id="progHistorico" type="checkbox" checked={progHistorico} onChange={(ev) => setProgHistorico(ev.target.checked)} />
              <label htmlFor="progHistorico">Lançamento histórico</label>
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-info">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Ativar desliga as validações de prazo e das regras da CLT (aviso de 30 dias, mínimo por fração) para este lançamento. Use apenas para registrar férias que já ocorreram.
            </p>
          </div>

          <label className="mt-4 flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">
              Justificativa {justificativaObrigatoria && <span className="text-danger">*</span>}
            </span>
            <input
              value={progJustificativa}
              onChange={(ev) => setProgJustificativa(ev.target.value)}
              required={justificativaObrigatoria}
              placeholder="Descreva o motivo…"
              className="w-full rounded-control border border-border-strong bg-surface px-3 py-2"
            />
            {justificativaObrigatoria && diasAntecedencia != null && (
              <span className="flex items-start gap-1.5 text-xs font-medium text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Obrigatória: faltam {diasAntecedencia} dia(s) para {formatDate(progInicio)}, fora da janela de {JANELA_AVISO_DIAS} dias de aviso.
              </span>
            )}
          </label>

          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={programarFerias.isPending}>
              Programar
            </Button>
          </div>
          {programarError && <p className="mt-2 text-right text-xs text-danger">{programarError}</p>}
        </form>
      </Card>

      {/* ---- histórico ---- */}
      <Card>
        <h3 className="text-sm font-semibold text-text">Histórico</h3>
        <p className="mb-3 mt-1 text-xs text-text-tertiary">Frações já concluídas, agendadas ou canceladas. Clique em uma linha para ver os detalhes.</p>

        {periodoAtual && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-text-secondary">
              <span>
                {formatDias(diasProgramadosPeriodoAtual)} de {formatDias(totalPeriodoAtual)} programados no período atual
              </span>
              <span>{pctProgramado}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pctProgramado}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {todasAsFracoes.map((f) => {
            const open = openFracao === f.id;
            const futura = new Date(f.dataInicio) > hoje;
            const temDoc = f.documentos.length > 0;
            const agendada = f.statusEfetivo === 'APROVADA' && futura;
            const label = agendada ? 'Agendada' : STATUS_FRACAO_LABEL[f.statusEfetivo];
            const tone = agendada ? 'blue' : ({ PENDENTE: 'coral', APROVADA: 'blue', REPROVADA: 'red', EM_ANDAMENTO: 'green', CONCLUIDA: 'green', CANCELADA: 'red' } as Record<StatusFracaoFerias, 'green' | 'blue' | 'coral' | 'red'>)[f.statusEfetivo];
            const podeCancelar = f.statusEfetivo === 'PENDENTE' || f.statusEfetivo === 'APROVADA' || f.statusEfetivo === 'EM_ANDAMENTO';
            const mostraCancelar = podeCancelar || f.statusEfetivo === 'CONCLUIDA';

            let hint: { texto: string; tone: 'green' | 'coral' | 'red' } | null = null;
            if (futura && !temDoc) hint = { texto: 'Aviso pendente', tone: 'red' };
            else if (!futura && !temDoc && (f.statusEfetivo === 'CONCLUIDA' || f.statusEfetivo === 'EM_ANDAMENTO')) hint = { texto: 'Recibo pendente', tone: 'coral' };
            else if (temDoc) hint = { texto: futura ? 'Aviso enviado' : 'Recibo anexado', tone: 'green' };

            return (
              <div key={f.id} className="overflow-hidden rounded-container border border-border">
                <button type="button" onClick={() => setOpenFracao(open ? null : f.id)} className="flex w-full flex-wrap items-center gap-2.5 px-3.5 py-3 text-left">
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform', !open && '-rotate-90')} />
                  <span className="text-sm font-semibold text-text">
                    {formatDate(f.dataInicio)} a {formatDate(f.dataFim)} ({formatDias(f.dias)}
                    {f.diasAbono > 0 ? ` · ${formatDias(f.diasAbono)} de abono` : ''})
                  </span>
                  <Badge tone={tone}>{label}</Badge>
                  {hint && (
                    <span className={cn('ml-auto flex items-center gap-1 text-xs font-semibold', hint.tone === 'green' ? 'text-success' : hint.tone === 'coral' ? 'text-info' : 'text-danger')}>
                      {hint.tone === 'green' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {hint.texto}
                    </span>
                  )}
                </button>
                {open && (
                  <div className="flex flex-col gap-3 border-t border-divider bg-surface-alt/50 px-3.5 py-3.5 pl-11">
                    <div className="flex flex-wrap gap-8">
                      <Stat label="Período aquisitivo" value={`${formatDate(f.periodo.dataInicio)}–${formatDate(f.periodo.dataFim)}`} />
                      <Stat label="Dias de gozo" value={f.dias} />
                      <Stat label="Abono" value={f.diasAbono} />
                    </div>
                    {f.justificativa && <p className="text-xs text-text-tertiary">{f.justificativa}</p>}
                    {f.documentos.map((d) => (
                      <a key={d.id} href={`${apiBaseUrl}/rh/employees/${employeeId}/documentos/${d.id}/arquivo`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                        {d.nome}
                      </a>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      {!temDoc && (futura || f.statusEfetivo === 'CONCLUIDA' || f.statusEfetivo === 'EM_ANDAMENTO') && (
                        <label className="cursor-pointer rounded-control border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-accent">
                          {uploadingFracaoId === f.id ? 'Enviando…' : futura ? 'Enviar aviso' : 'Anexar recibo'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="hidden"
                            disabled={uploadingFracaoId === f.id}
                            onChange={(ev) => {
                              const file = ev.target.files?.[0];
                              if (file) {
                                setUploadingFracaoId(f.id);
                                addFracaoDocumento.mutate({ fracaoId: f.id, file, rotulo: futura ? 'Aviso de férias' : 'Recibo de férias' });
                              }
                              ev.target.value = '';
                            }}
                          />
                        </label>
                      )}
                      {f.status === 'PENDENTE' && (
                        <>
                          <Button onClick={() => aprovarFracao.mutate(f.id)}>Aprovar</Button>
                          <Button variant="secondary" onClick={() => reprovarFracao.mutate(f.id)}>
                            Reprovar
                          </Button>
                        </>
                      )}
                      {mostraCancelar &&
                        (podeCancelar ? (
                          <Button variant="cancel" onClick={() => cancelarFracao.mutate(f.id)}>
                            Cancelar
                          </Button>
                        ) : (
                          <Button variant="cancel" disabled>
                            Cancelar
                          </Button>
                        ))}
                    </div>
                    {!podeCancelar && f.statusEfetivo === 'CONCLUIDA' && <p className="text-[10.5px] text-text-tertiary">Férias já concluídas não podem ser canceladas.</p>}
                    {uploadFracaoError?.fracaoId === f.id && <p className="text-xs text-danger">{uploadFracaoError.message}</p>}
                  </div>
                )}
              </div>
            );
          })}
          {todasAsFracoes.length === 0 && <p className="py-6 text-center text-sm text-text-tertiary">Sem registros.</p>}
        </div>
      </Card>

      {showConformidade && (
        <Modal open onClose={() => setShowConformidade(false)} title="Conformidade de férias">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">{employee.nome}</p>
            <p className="text-3xl font-bold text-text">{conformidade.pontuacao}%</p>
          </div>
          <div className="my-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-info" style={{ width: `${conformidade.pontuacao}%` }} />
          </div>
          <div className="flex flex-col gap-2.5">
            {conformidade.itens.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text">
                {item.done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-info" />}
                <span className="flex-1">{item.label}</span>
                {item.tag && <Badge tone={item.tag === 'prazo' ? 'red' : 'coral'}>{item.tag}</Badge>}
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-divider pt-3 text-xs leading-relaxed text-text-tertiary">
            A pontuação pondera prazo de aviso e documentação (avisos/recibos anexados) — nem todo item tem o mesmo peso.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-xs">
      <div className="text-text-tertiary">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-text">{value}</div>
    </div>
  );
}
