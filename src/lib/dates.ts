import type { ISODate } from '../domain/types';

export const TIME_ZONE = 'America/Sao_Paulo';

/** Hoje em São Paulo, 'AAAA-MM-DD' */
export function todayISO(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Dias inteiros entre duas datas locais (b − a). Sem fuso: trata as datas como dias de calendário. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: ISODate, n: number): ISODate {
  const t = new Date(toUTC(d) + n * 86_400_000);
  return t.toISOString().slice(0, 10);
}

/** Soma meses mantendo o dia, ajustado ao fim de meses curtos (31/01 + 1 → 28/02) */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** 'AAAA-MM' */
export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}

export function startOfMonth(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

export function endOfMonth(d: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(d), 1), -1);
}

/** Lista de chaves 'AAAA-MM' de from até to (inclusive) */
export function monthRange(from: ISODate, to: ISODate): string[] {
  const out: string[] = [];
  let cur = startOfMonth(from);
  const last = monthKey(to);
  while (monthKey(cur) <= last) {
    out.push(monthKey(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parts(d: ISODate) {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m, day };
}

/** 12 de setembro de 2027 */
export function formatLong(d: ISODate): string {
  const { y, m, day } = parts(d);
  return `${day} de ${MONTHS[m - 1]} de ${y}`;
}

/** 05/11/2026 */
export function formatShort(d: ISODate): string {
  const { y, m, day } = parts(d);
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** { day: '05', month: 'NOV' } */
export function formatChip(d: ISODate): { day: string; month: string } {
  const { m, day } = parts(d);
  return { day: String(day).padStart(2, '0'), month: MONTHS_SHORT[m - 1].toUpperCase() };
}

/** 'nov' ou 'nov/27' quando o ano muda */
export function formatMonthKey(key: string, withYear = false): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS_SHORT[m - 1];
  return withYear ? `${name}/${String(y).slice(2)}` : name;
}

export function formatMonthLong(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}
