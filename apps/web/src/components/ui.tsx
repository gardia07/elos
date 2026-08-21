'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={cn('rounded-container border border-border bg-surface p-5', className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, delta, href }: { label: string; value: ReactNode; delta?: ReactNode; href?: string }) {
  const content = (
    <>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">{label}</span>
      <span className="text-[26px] font-semibold text-text">{value}</span>
      {delta && <span className="text-xs">{delta}</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="flex flex-col gap-1 transition hover:border-accent">{content}</Card>
      </Link>
    );
  }
  return <Card className="flex flex-col gap-1">{content}</Card>;
}

const BADGE_COLORS: Record<string, string> = {
  green: 'bg-success-bg text-success',
  amber: 'bg-warning-bg text-warning',
  red: 'bg-danger/10 text-danger',
  darkred: 'bg-danger-deep/10 text-danger-deep',
  blue: 'bg-tint-blue text-accent',
  grey: 'bg-surface-alt text-text-secondary',
};

export function Badge({ tone = 'grey', children }: { tone?: keyof typeof BADGE_COLORS; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-medium ${BADGE_COLORS[tone]}`}>
      {children}
    </span>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'cancel' | 'confirm';

// Formato "pilula de badge, so que clicavel" -- aprovado pela Gabi via provador de botoes:
// fundo suave (10% da cor), letra colorida, pilula totalmente redonda, texto pequeno.
// Mesmo padding/fonte/raio em todas as variantes -- só a cor muda.
const SOFT_BLUE = 'border border-transparent px-2.5 py-1 text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20';
const SOFT_RED = 'border border-transparent px-2.5 py-1 text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: SOFT_BLUE,
  // Neutro (outline) -- unica variante sem cor de texto, mesmo tamanho/raio das demais.
  secondary: 'border border-border-strong px-2.5 py-1 text-xs font-medium bg-surface text-text hover:border-accent',
  danger: SOFT_RED,
  // Mesma cor do danger -- sinaliza cancelamento/recuo, reaproveitando o vermelho em vez de criar um tom novo.
  cancel: SOFT_RED,
  // Mesma cor do primary -- confirmacao leve, mesmo azul-acinzentado do "primary".
  confirm: SOFT_BLUE,
};

// Exportado pra estilizar elementos que não podem ser um <button> (ex.: <Link> que navega mas
// visualmente é um botão primário) com o mesmo formato, sem duplicar os valores de padding/raio/fonte.
export function buttonClasses(variant: ButtonVariant = 'primary', className = '') {
  return `rounded-button transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`;
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={buttonClasses(variant, className)} {...props}>
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
      <div className="scroll-suave relative flex h-full w-[440px] max-w-full flex-col overflow-y-auto bg-surface p-6 shadow-[-8px_0_30px_rgba(61,61,61,0.12)]">
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

// Dialog centralizado -- diferente do Drawer (painel lateral, altura cheia), pra formularios
// curtos que nao precisam do espaco de uma tela inteira. Fecha no X, no overlay ou em Cancelar
// (o proprio conteudo decide o botao de cancelar).
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="scroll-suave relative flex max-h-[90vh] w-[460px] max-w-full flex-col overflow-y-auto rounded-container border border-border bg-surface p-6 shadow-lg">
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
