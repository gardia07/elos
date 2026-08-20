'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={cn('rounded-[10px] border border-border bg-surface p-5', className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, delta }: { label: string; value: ReactNode; delta?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">{label}</span>
      <span className="text-[26px] font-semibold text-text">{value}</span>
      {delta && <span className="text-xs">{delta}</span>}
    </Card>
  );
}

const BADGE_COLORS: Record<string, string> = {
  green: 'bg-success-bg text-success',
  amber: 'bg-warning-bg text-warning',
  red: 'bg-danger/10 text-danger',
  blue: 'bg-tint-blue text-accent',
  grey: 'bg-surface-alt text-text-secondary',
};

export function Badge({ tone = 'grey', children }: { tone?: keyof typeof BADGE_COLORS; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_COLORS[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'cancel' }) {
  const variants: Record<string, string> = {
    primary: 'px-3.5 py-2 text-sm font-medium bg-accent text-on-accent hover:opacity-90',
    secondary: 'px-3.5 py-2 text-sm font-medium border border-border-strong bg-surface text-text hover:border-accent',
    danger: 'px-3.5 py-2 text-sm font-medium bg-danger text-white hover:opacity-90',
    // Mesmo formato do botão "Anexar" (outline pequeno) -- só a cor do texto muda pra sinalizar cancelamento.
    cancel: 'px-2 py-1 text-xs border border-border-strong bg-surface text-[#DC2626] hover:bg-[#FEF2F2]',
  };
  return (
    <button
      className={`rounded-[10px] transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-border-strong',
      )}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-[440px] max-w-full flex-col overflow-y-auto bg-surface p-6 shadow-[-8px_0_30px_rgba(61,61,61,0.12)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-text-tertiary">{children}</p>;
}
