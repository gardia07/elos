'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Drawer } from '@/components/ui';
import { ExternalIcon } from './external-icons';
import type { AtalhoExterno } from './types';

export interface AtalhoFormValues {
  nome: string;
  url: string;
  icone: string;
}

const ICONES_DISPONIVEIS = [
  'FileText',
  'Landmark',
  'Banknote',
  'Receipt',
  'HardDrive',
  'CalendarDays',
  'Cloud',
  'Linkedin',
  'Briefcase',
  'Video',
  'Camera',
  'Kanban',
  'CheckSquare',
  'BookOpen',
];

export function AtalhoDrawer({
  open,
  onClose,
  atalho,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  atalho?: AtalhoExterno | null;
  onSave: (values: AtalhoFormValues) => void;
  onDelete?: () => void;
  saving?: boolean;
}) {
  const [values, setValues] = useState<AtalhoFormValues>({ nome: '', url: '', icone: 'FileText' });

  useEffect(() => {
    if (open) setValues({ nome: atalho?.nome ?? '', url: atalho?.url ?? '', icone: atalho?.icone ?? 'FileText' });
  }, [open, atalho]);

  return (
    <Drawer open={open} onClose={onClose} title={atalho ? 'Editar atalho' : 'Novo atalho externo'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Nome</span>
          <input
            value={values.nome}
            onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))}
            required
            autoFocus
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">URL</span>
          <input
            type="url"
            value={values.url}
            onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
            placeholder="https://…"
            required
            className="rounded-control border border-border-strong bg-surface px-3 py-2"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm text-text-secondary">Ícone</span>
          <div className="flex flex-wrap gap-2">
            {ICONES_DISPONIVEIS.map((icone) => (
              <button
                key={icone}
                type="button"
                onClick={() => setValues((v) => ({ ...v, icone }))}
                className={`flex h-9 w-9 items-center justify-center rounded-control border transition ${
                  values.icone === icone ? 'border-accent bg-tint-blue text-accent' : 'border-border-strong bg-surface text-text-secondary'
                }`}
              >
                <ExternalIcon nome={icone} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          {onDelete ? (
            <button type="button" onClick={onDelete} className="flex items-center gap-1.5 text-sm text-danger hover:underline">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
