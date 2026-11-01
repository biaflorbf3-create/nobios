import type { Cents, Contract, Quote, Supplier } from '../types';

export type SupplierDisplayStatus =
  | 'researching'
  | 'quoted'
  | 'negotiating'
  | 'contracted'
  | 'finished'
  | 'cancelled';

export const SUPPLIER_STATUS_LABEL: Record<SupplierDisplayStatus, string> = {
  researching: 'Pesquisando',
  quoted: 'Orçamento recebido',
  negotiating: 'Negociando',
  contracted: 'Contratado',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

/** Prioridade: Cancelado → Finalizado → Contratado (tem contrato ativo) → funil manual */
export function supplierDisplayStatus(supplier: Supplier, activeContracts: Contract[]): SupplierDisplayStatus {
  if (supplier.pipelineStatus === 'cancelled') return 'cancelled';
  if (supplier.delivered && activeContracts.length > 0) return 'finished';
  if (activeContracts.length > 0) return 'contracted';
  return supplier.pipelineStatus;
}

export interface SupplierView {
  supplier: Supplier;
  status: SupplierDisplayStatus;
  favorite: boolean;
  contracts: Contract[];
  categoryIds: string[];
  quoted: Cents | null;
  contracted: Cents;
  paid: Cents;
  remaining: Cents;
}

export function bestQuote(quotes: Quote[]): Quote | null {
  if (!quotes.length) return null;
  return quotes.find((q) => q.status === 'accepted') ?? quotes.find((q) => q.favorite) ?? quotes[0];
}
