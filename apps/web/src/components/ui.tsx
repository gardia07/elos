'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[12px] border border-border bg-surface p-5', className)}>{children}</div>;
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants: Record<string, string> = {
    primary: 'bg-accent text-on-accent hover:opacity-90',
    secondary: 'border border-border-strong bg-surface text-text hover:border-accent',
    danger: 'bg-danger text-white hover:opacity-90',
  };
  return (
    <button
      className={`rounded-[10px] px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
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
