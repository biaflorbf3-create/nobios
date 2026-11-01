import type { Finance, InstallmentView } from '../../domain/finance';
import type { Snapshot } from '../../domain/types';

export interface PaymentRow {
  v: InstallmentView;
  supplierId: string;
  supplierName: string;
  categoryId: string;
  categoryName: string;
}

/** Todas as parcelas de contratos ativos, com nomes resolvidos, por vencimento */
export function buildRows(snapshot: Snapshot, finance: Finance): PaymentRow[] {
  const sup = new Map(snapshot.suppliers.map((s) => [s.id, s.name]));
  const cat = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  return finance.installments
    .filter((v) => v.contract.status === 'active')
    .map((v) => ({
      v,
      supplierId: v.contract.supplierId,
      supplierName: sup.get(v.contract.supplierId) ?? '',
      categoryId: v.contract.categoryId,
      categoryName: cat.get(v.contract.categoryId) ?? '',
    }));
}

export type StatusFilter = 'all' | 'paid' | 'open' | 'overdue';

export function matchStatus(v: InstallmentView, f: StatusFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'paid':
      return v.status === 'paid';
    case 'overdue':
      return v.status === 'overdue';
    case 'open':
      return v.status === 'upcoming' || v.status === 'due-soon' || v.status === 'partial';
  }
}
