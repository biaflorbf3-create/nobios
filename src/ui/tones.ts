import type { BudgetState, InstallmentStatus, SupplierDisplayStatus } from '../domain/finance';
import type { Palette } from '../styles/theme';
import type { Tone } from './StatusBadge';

export const INSTALLMENT_TONE: Record<InstallmentStatus, Tone> = {
  paid: 'ok',
  overdue: 'danger',
  partial: 'warn',
  'due-soon': 'warn',
  upcoming: 'info',
};

export const BUDGET_TONE: Record<BudgetState, Tone> = {
  within: 'ok',
  near: 'warn',
  over: 'danger',
  unbudgeted: 'neutral',
  empty: 'neutral',
};

export const BUDGET_LABEL: Record<BudgetState, string> = {
  within: 'Dentro do orçamento',
  near: 'Próximo do limite',
  over: 'Acima do orçamento',
  unbudgeted: 'Sem orçamento',
  empty: '—',
};

/** cor da barra por estado, como variável CSS (funciona nos dois temas) */
export const BUDGET_BAR: Record<BudgetState, string> = {
  within: 'rgb(var(--ok))',
  near: 'rgb(var(--warn))',
  over: 'rgb(var(--danger))',
  unbudgeted: 'rgb(var(--ink-faint))',
  empty: 'rgb(var(--ink-faint))',
};

/** a mesma cor em hex, para SVG/gráficos */
export const budgetHex = (p: Palette, s: BudgetState) =>
  s === 'within' ? p.ok : s === 'near' ? p.warn : s === 'over' ? p.danger : p.inkFaint;

export const SUPPLIER_TONE: Record<SupplierDisplayStatus, Tone> = {
  researching: 'neutral',
  quoted: 'info',
  negotiating: 'warn',
  contracted: 'ok',
  finished: 'ok',
  cancelled: 'neutral',
};
