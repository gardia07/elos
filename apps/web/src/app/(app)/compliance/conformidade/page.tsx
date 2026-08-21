'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card, Switch } from '@/components/ui';

type TipoEvento =
  | 'ADMISSAO'
  | 'MUDANCA_CARGO_FUNCAO'
  | 'MUDANCA_CARGA_HORARIA'
  | 'MUDANCA_SALARIAL'
  | 'INICIO_AFASTAMENTO'
  | 'ACIDENTE_TRABALHO'
  | 'RETORNO_AFASTAMENTO'
  | 'LICENCA_MATERNIDADE'
  | 'TRANSFERENCIA_LOCAL'
  | 'MUDANCA_REGIME_TRABALHO'
  | 'ADVERTENCIA_SUSPENSAO'
  | 'ASO_PERIODICO_VENCIDO'
  | 'TREINAMENTO_NR_VENCIDO'
  | 'DESLIGAMENTO'
  | 'AFASTAMENTO_RECAIDA_15_DIAS';

const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  ADMISSAO: 'Admissão',
  MUDANCA_CARGO_FUNCAO: 'Mudança de cargo/função',
  MUDANCA_CARGA_HORARIA: 'Mudança de carga horária',
  MUDANCA_SALARIAL: 'Mudança salarial/promoção',
  INICIO_AFASTAMENTO: 'Início de afastamento (doença)',
  ACIDENTE_TRABALHO: 'Acidente de trabalho',
  RETORNO_AFASTAMENTO: 'Retorno de afastamento (≥30 dias)',
  LICENCA_MATERNIDADE: 'Licença-maternidade',
  TRANSFERENCIA_LOCAL: 'Transferência de local',
  MUDANCA_REGIME_TRABALHO: 'Mudança de regime de trabalho',
  ADVERTENCIA_SUSPENSAO: 'Advertência/Suspensão',
  ASO_PERIODICO_VENCIDO: 'ASO periódico vencido',
  TREINAMENTO_NR_VENCIDO: 'Treinamento de NR vencido',
  DESLIGAMENTO: 'Desligamento',
  AFASTAMENTO_RECAIDA_15_DIAS: 'Recaída — 15 dias acumulados (mesmo CID)',
};

interface RegraConformidade {
  id: string;
  tipoEventoGatilho: TipoEvento;
  condicaoAdicional: string | null;
  prazoDias: number;
  bloqueante: boolean;
  baseLegal: string | null;
  ativo: boolean;
  documentoExigido: { id: string; nome: string };
}

function RegraRow({ regra }: { regra: RegraConformidade }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [prazoDias, setPrazoDias] = useState(regra.prazoDias);
  const [bloqueante, setBloqueante] = useState(regra.bloqueante);
  const [baseLegal, setBaseLegal] = useState(regra.baseLegal ?? '');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['compliance-engine', 'regras'] });

  const salvar = useMutation({
    mutationFn: async () => api.patch(`/compliance-engine/regras/${regra.id}`, { prazoDias, bloqueante, baseLegal: baseLegal || null }),
    onSuccess: () => {
      invalidate();
      setEditando(false);
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (ativo: boolean) => api.patch(`/compliance-engine/regras/${regra.id}`, { ativo }),
    onSuccess: invalidate,
  });

  if (editando) {
    return (
      <tr className="border-b border-divider last:border-0">
        <td className="px-5 py-3 align-top">{TIPO_EVENTO_LABEL[regra.tipoEventoGatilho]}</td>
        <td className="px-5 py-3 align-top">{regra.documentoExigido.nome}</td>
        <td className="px-5 py-3 align-top">
          <input
            type="number"
            min={0}
            value={prazoDias}
            onChange={(e) => setPrazoDias(Number(e.target.value))}
            className="w-20 rounded-control border border-border-strong bg-surface px-2 py-1 text-sm"
          />
        </td>
        <td className="px-5 py-3 align-top">
          <Switch checked={bloqueante} onChange={setBloqueante} />
        </td>
        <td className="px-5 py-3 align-top">
          <input
            value={baseLegal}
            onChange={(e) => setBaseLegal(e.target.value)}
            placeholder="Base legal"
            className="w-full rounded-control border border-border-strong bg-surface px-2 py-1 text-sm"
          />
        </td>
        <td className="px-5 py-3 align-top">
          <Badge tone={regra.ativo ? 'green' : 'grey'}>{regra.ativo ? 'Ativa' : 'Inativa'}</Badge>
        </td>
        <td className="px-5 py-3 align-top">
          <div className="flex gap-1.5">
            <Button variant="confirm" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Salvar
            </Button>
            <Button variant="cancel" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-divider last:border-0 hover:bg-surface-alt">
      <td className="px-5 py-3">{TIPO_EVENTO_LABEL[regra.tipoEventoGatilho]}</td>
      <td className="px-5 py-3">
        {regra.documentoExigido.nome}
        {regra.condicaoAdicional && <div className="text-xs text-text-tertiary">{regra.condicaoAdicional}</div>}
      </td>
      <td className="px-5 py-3">{regra.prazoDias === 0 ? 'Imediato' : `${regra.prazoDias} dia(s)`}</td>
      <td className="px-5 py-3">
        <Badge tone={regra.bloqueante ? 'red' : 'grey'}>{regra.bloqueante ? 'Bloqueante' : 'Não bloqueante'}</Badge>
      </td>
      <td className="px-5 py-3 text-text-secondary">{regra.baseLegal ?? '—'}</td>
      <td className="px-5 py-3">
        <Switch checked={regra.ativo} onChange={(v) => toggleAtivo.mutate(v)} disabled={toggleAtivo.isPending} />
      </td>
      <td className="px-5 py-3">
        <Button variant="secondary" onClick={() => setEditando(true)}>
          Editar
        </Button>
      </td>
    </tr>
  );
}

export default function ConformidadeDocumentalPage() {
  const { data: regras } = useQuery({
    queryKey: ['compliance-engine', 'regras'],
    queryFn: async () => (await api.get<RegraConformidade[]>('/compliance-engine/regras')).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Base de regras do Motor de Conformidade Documental — cada linha liga um evento do cadastro do colaborador a um
        documento exigido, com prazo e se bloqueia o colaborador enquanto pendente. Ajustes aqui valem imediatamente,
        sem precisar de deploy.
      </p>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-text-tertiary">
              <th className="px-5 py-3 font-medium">Evento</th>
              <th className="px-5 py-3 font-medium">Documento exigido</th>
              <th className="px-5 py-3 font-medium">Prazo</th>
              <th className="px-5 py-3 font-medium">Bloqueio</th>
              <th className="px-5 py-3 font-medium">Base legal</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {regras?.map((r) => (
              <RegraRow key={r.id} regra={r} />
            ))}
          </tbody>
        </table>
        {regras?.length === 0 && <p className="py-8 text-center text-sm text-text-tertiary">Nenhuma regra cadastrada.</p>}
      </Card>
    </div>
  );
}
