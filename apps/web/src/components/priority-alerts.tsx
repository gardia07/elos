export type AlertSeveridade = 'alta' | 'media' | 'baixa';

export interface PriorityAlert {
  categoria: string;
  mensagem: string;
  severidade: AlertSeveridade;
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
}: {
  alertas: PriorityAlert[];
  /** Overrides the default categoria → cor map; falls back to severidade when a categoria isn't listed. */
  categoriaColor?: Record<string, string>;
}) {
  return (
    <div className="rounded-[16px] bg-white p-6 shadow-[0_2px_16px_rgba(31,31,31,0.06)]">
      <h3 className="mb-4 text-lg font-bold text-[#1F1F1F]">Alertas prioritários</h3>
      <div className="flex flex-col gap-3">
        {alertas.map((alerta, i) => {
          const cor = categoriaColor[alerta.categoria] ?? SEVERIDADE_COLOR[alerta.severidade];
          return (
            <div key={i} className="flex items-start gap-3 rounded-[12px] bg-[#FDF9F5] p-4">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A94A6]">{alerta.categoria}</span>
                <span className="text-[15px] leading-snug text-[#2D2D2D]">{alerta.mensagem}</span>
              </div>
            </div>
          );
        })}
        {alertas.length === 0 && <p className="text-sm text-[#8A94A6]">Nenhum alerta prioritário no momento.</p>}
      </div>
    </div>
  );
}
