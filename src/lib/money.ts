import type { Cents } from '../domain/types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlRound = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** R$ 2.500,00 — ou R$ 2.500 quando não há centavos e `smart` está ligado */
export function formatMoney(cents: Cents, opts: { smart?: boolean; cents?: boolean } = {}): string {
  const { smart = true, cents: forceCents = false } = opts;
  const value = cents / 100;
  const hasCents = cents % 100 !== 0;
  const s = forceCents || (smart && hasCents) ? brl.format(value) : brlRound.format(value);
  return s.replace(/ /g, ' ');
}

/** 7,5 mil · 11 mil — para eixos de gráfico */
export function formatMoneyShort(cents: Cents): string {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `${compact.format(v / 1000)} mil`;
  return compact.format(v);
}

/**
 * Lê o que a pessoa digitou: "2500", "2.500", "2.500,00", "2500,5", "R$ 1.250,90".
 * Retorna centavos ou null se não for um número.
 */
export function parseMoney(input: string): Cents | null {
  let s = input.replace(/R\$|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    // "2.500" ou "1.250.000" = milhar; "2500.5" = decimal
    const thousands = parts.length > 2 || parts[parts.length - 1].length === 3;
    if (thousands) s = parts.join('');
  }
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Valor para exibir dentro de um campo: 2.500 ou 2.500,50 */
export function formatMoneyInput(cents: Cents): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function reais(value: number): Cents {
  return Math.round(value * 100);
}

export function sum(values: Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0);
}

export function formatPct(ratio: number, digits = 0): string {
  return `${(ratio * 100).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}
