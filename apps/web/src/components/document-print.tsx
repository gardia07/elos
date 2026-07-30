'use client';

import { Button } from '@/components/ui';
import { type TenantInfo } from '@/components/empresa-form';

/** Visualização "papel timbrado" de um documento gerado a partir de um modelo — imprime/gera PDF via window.print(), mesmo mecanismo do Registro de Empregado. */
export function DocumentoImpressao({ texto, tenant }: { texto: string; tenant?: TenantInfo | null }) {
  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #documento-gerado-print, #documento-gerado-print * { visibility: visible; }
          #documento-gerado-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimir / Gerar PDF
        </Button>
      </div>

      <div id="documento-gerado-print" className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-[10px] border border-border bg-surface p-8">
        <div className="flex items-center gap-3 border-b border-divider pb-4">
          {tenant?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt="" className="h-12 w-12 rounded object-contain" />
          )}
          <div>
            <div className="text-sm font-semibold">{tenant?.nomeFantasia || tenant?.name || 'Empresa'}</div>
            {tenant?.cnpj && <div className="text-xs text-text-tertiary">CNPJ {tenant.cnpj}</div>}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-text">{texto}</div>
      </div>
    </div>
  );
}
