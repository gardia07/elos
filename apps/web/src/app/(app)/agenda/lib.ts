'use client';

import { useEffect, useState } from 'react';
import type { Categoria } from './types';

export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Datas de agenda são gravadas como meia-noite UTC do dia — parsear como UTC evita off-by-one por fuso ao comparar/formatar em UTC. */
export function parseIsoUtc(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

/** Constrói um Date "de parede" local a partir de YYYY-MM-DD — para usar em aritmética de grade local (mês/semana), nunca misturar com parseIsoUtc. */
export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysLocal(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function startOfWeekSunday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

/** Semanas completas (domingo–sábado) que cobrem o mês do anchor, para a visão Mês. */
export function getMonthGridWeeks(anchor: Date): Date[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = addDaysLocal(firstOfMonth, -firstOfMonth.getDay());
  const totalCells = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;
  const days: Date[] = [];
  for (let i = 0; i < totalCells; i++) days.push(addDaysLocal(gridStart, i));
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function formatMonthYear(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Para Date locais "de parede" (ex.: anchorDate calculado via aritmética local) — nunca para datas vindas da API. */
export function formatDiaLongo(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Para strings YYYY-MM-DD vindas da API — formata em UTC para não sofrer off-by-one por fuso (ex.: usuário no Brasil). */
export function formatDiaLongoIso(iso: string): string {
  const s = parseIsoUtc(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const HORA_INICIO = 6;
export const HORA_FIM = 22;

export function horaToMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutosToHora(min: number): string {
  const clamped = Math.max(HORA_INICIO * 60, Math.min(HORA_FIM * 60, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Observa o atributo data-theme (mesmo padrão de components/header.tsx) para escolher cor clara/escura de categoria em tempo real. */
export function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return setIsDark(true);
      if (attr === 'light') return setIsDark(false);
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', read);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', read);
    };
  }, []);

  return isDark;
}

export function categoriaCor(categoria: Categoria | null | undefined, isDark: boolean, fallback = '#a89c8d'): string {
  if (!categoria) return fallback;
  return isDark ? categoria.corDark : categoria.cor;
}
