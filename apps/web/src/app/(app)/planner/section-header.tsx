'use client';

import type { ReactNode } from 'react';
import type { SecaoTema } from './theme';

export function SectionHeader({ tema, stat }: { tema: SecaoTema; stat?: ReactNode }) {
  const Icon = tema.icon;
  return (
    <div className="mb-5 flex items-center gap-4 rounded-[10px] p-5" style={{ backgroundColor: `${tema.cor}17` }}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${tema.cor}30` }}>
        <Icon className="h-6 w-6" style={{ color: tema.cor }} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-text">{tema.label}</h2>
        <p className="text-sm text-text-secondary">{tema.descricao}</p>
      </div>
      {stat && <div className="shrink-0 text-right">{stat}</div>}
    </div>
  );
}
