'use client';

import Link from 'next/link';

export type AlertSeveridade = 'alta' | 'media' | 'baixa';

export interface PriorityAlert {
  id: string;
  categoria: string;
  mensagem: string;
  severidade: AlertSeveridade;
  /** Quando presente, o bloco inteiro vira um link para a página onde a ação é resolvida. */
  href?: string;
}

const SEVERIDADE_COLOR: Record<AlertSeveridade, string> = {
  alta: '#A94438',
  media: '#D19A3E',
  baixa: '#3B3F63',
};

const DEFAULT_CATEGORIA_COLOR: Record<string, string> = {
  SST: '#A94438',
  DP: '#A94438',
  COMPLIANCE: '#D19A3E',
  PSICOLOGIA: '#3B3F63',
};

export function PriorityAlerts({
  alertas,
  categoriaColor = DEFAULT_CATEGORIA_COLOR,
  onResolver,
}: {
  alertas: PriorityAlert[];
  /** Overrides the default categoria → cor map; falls back to severidade when a categoria isn't listed. */
  categoriaColor?: Record<string, string>;
  /** Chamado quando o usuário marca o alerta como resolvido manualmente. */
  onResolver?: (id: string) => void;
}) {
  return (
    <div className="flex max-h-[420px] flex-col rounded-[10px] border border-border bg-surface p-4 shadow-sm">
      <h3 className="mb-3 shrink-0 text-sm font-bold text-text">Alertas prioritários</h3>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {alertas.map((alerta) => {
          const cor = categoriaColor[alerta.categoria] ?? SEVERIDADE_COLOR[alerta.severidade];
          const content = (
            <>
              {onResolver && (
                <input
                  type="checkbox"
                  checked={false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onResolver(alerta.id);
                  }}
                  className="mt-0.5 shrink-0"
                />
              )}
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-text-tertiary">{alerta.categoria}</span>
                <span className="text-xs leading-snug text-text">{alerta.mensagem}</span>
              </div>
            </>
          );
          return alerta.href ? (
            <Link key={alerta.id} href={alerta.href} className="flex items-start gap-2 rounded-[10px] bg-surface-alt p-2.5 transition hover:bg-border">
              {content}
            </Link>
          ) : (
            <div key={alerta.id} className="flex items-start gap-2 rounded-[10px] bg-surface-alt p-2.5">
              {content}
            </div>
          );
        })}
        {alertas.length === 0 && <p className="text-xs text-text-tertiary">Nenhum alerta prioritário no momento.</p>}
      </div>
    </div>
  );
}
