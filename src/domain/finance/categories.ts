import type { Category, Cents } from '../types';

export type BudgetState = 'within' | 'near' | 'over' | 'unbudgeted' | 'empty';

/**
 * Estado da categoria:
 * - dentro: contratado < nearLimitPct% do planejado
 * - próximo do limite: entre nearLimitPct% e 100%
 * - acima: > 100%
 * - sem orçamento: há contrato mas nenhum planejado
 * - vazio: nem planejado nem contrato
 */
export function budgetState(planned: Cents | null, contracted: Cents, nearLimitPct: number): BudgetState {
  if (!planned) return contracted > 0 ? 'unbudgeted' : 'empty';
  const ratio = contracted / planned;
  if (ratio > 1) return 'over';
  if (ratio >= nearLimitPct / 100) return 'near';
  return 'within';
}

export interface CategoryView {
  category: Category;
  planned: Cents | null;
  contracted: Cents;
  paid: Cents;
  /** planejado − contratado (negativo = estourado). null sem planejado. */
  difference: Cents | null;
  /** contratado ÷ planejado. null sem planejado. */
  ratio: number | null;
  state: BudgetState;
  hasContract: boolean;
  supplierIds: string[];
  /** participação no total contratado do casamento */
  share: number;
}
