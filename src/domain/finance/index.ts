/**
 * Fonte única de todos os números do app.
 * Nenhuma tela soma valores por conta própria: tudo vem de buildFinance(snapshot, hoje).
 */
import type { Cents, Contract, ISODate, Payment, PaymentMethod, Snapshot } from '../types';
import { daysBetween } from '../../lib/dates';
import { ALERT_ORDER, UNCONTRACTED_ALERT_DAYS, type Alert } from './alerts';
import { budgetState, type CategoryView } from './categories';
import { buildCashflow, type Cashflow } from './cashflow';
import { buildInstallmentView, type InstallmentView } from './installments';
import { bestQuote, supplierDisplayStatus, type SupplierView } from './suppliers';

export * from './alerts';
export * from './categories';
export * from './cashflow';
export * from './installments';
export * from './schedule';
export * from './payments';
export * from './suppliers';

export interface ContractView {
  contract: Contract;
  paid: Cents;
  /** máx(0, valor − pago); 0 para cancelados */
  remaining: Cents;
  scheduled: Cents;
  /** valor − Σ parcelas (contrato sem cronograma completo) */
  unscheduled: Cents;
  installments: InstallmentView[];
}

export interface Totals {
  planned: Cents;
  contracted: Cents;
  paid: Cents;
  toPay: Cents;
  /** planejado − contratado; negativo = estourado */
  available: Cents;
  /** contratado ÷ planejado */
  commitment: number;
  /** planejado − Σ orçamentos das categorias */
  unallocated: Cents;
  allocated: Cents;
}

export interface Finance {
  today: ISODate;
  daysToWedding: number;
  totals: Totals;
  contracts: Map<string, ContractView>;
  installments: InstallmentView[];
  categories: CategoryView[];
  suppliers: SupplierView[];
  contractedSupplierCount: number;
  /** categorias necessárias sem contrato ativo */
  pendingCategories: CategoryView[];
  alerts: Alert[];
  byPayer: { personId: string; amount: Cents }[];
  byMethod: { method: PaymentMethod; amount: Cents }[];
  cashflow: (from: ISODate, to: ISODate) => Cashflow;
}

export function buildFinance(s: Snapshot, today: ISODate): Finance {
  const { wedding } = s;
  const supplierById = new Map(s.suppliers.map((x) => [x.id, x]));

  // ── Pagamentos indexados
  const paymentsByInstallment = groupBy(s.payments.filter((p) => p.installmentId), (p) => p.installmentId!);
  const paymentsByContract = groupBy(s.payments, (p) => p.contractId);

  // ── Parcelas
  const contractById = new Map(s.contracts.map((c) => [c.id, c]));
  const installments: InstallmentView[] = s.installments
    .filter((i) => contractById.has(i.contractId))
    .map((i) =>
      buildInstallmentView(i, contractById.get(i.contractId)!, paymentsByInstallment.get(i.id) ?? [], today, wedding.dueSoonDays),
    )
    .sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate) || a.installment.sequence - b.installment.sequence);
  const installmentsByContract = groupBy(installments, (v) => v.contract.id);

  // ── Contratos
  const contracts = new Map<string, ContractView>();
  for (const c of s.contracts) {
    const paid = sumBy(paymentsByContract.get(c.id) ?? [], (p) => p.amount);
    const inst = (installmentsByContract.get(c.id) ?? []).sort((a, b) => a.installment.sequence - b.installment.sequence);
    const scheduled = sumBy(inst, (v) => v.installment.amount);
    const active = c.status === 'active';
    contracts.set(c.id, {
      contract: c,
      paid,
      remaining: active ? Math.max(0, c.totalValue - paid) : 0,
      scheduled,
      unscheduled: active ? Math.max(0, c.totalValue - scheduled) : 0,
      installments: inst,
    });
  }
  const activeContracts = s.contracts.filter((c) => c.status === 'active');
  const activeIds = new Set(activeContracts.map((c) => c.id));

  // ── Totais
  const contracted = sumBy(activeContracts, (c) => c.totalValue);
  const paid = sumBy(s.payments, (p) => p.amount);
  const toPay = sumBy([...contracts.values()], (v) => v.remaining);
  const allocated = sumBy(s.categories, (c) => (c.need === 'dismissed' ? 0 : c.plannedBudget ?? 0));
  const totals: Totals = {
    planned: wedding.totalBudget,
    contracted,
    paid,
    toPay,
    available: wedding.totalBudget - contracted,
    commitment: wedding.totalBudget > 0 ? contracted / wedding.totalBudget : 0,
    allocated,
    unallocated: wedding.totalBudget - allocated,
  };

  // ── Categorias
  const contractsByCategory = groupBy(activeContracts, (c) => c.categoryId);
  const categories: CategoryView[] = [...s.categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => {
      const cs = contractsByCategory.get(category.id) ?? [];
      const catContracted = sumBy(cs, (c) => c.totalValue);
      const catPaid = sumBy(cs, (c) => contracts.get(c.id)!.paid);
      const planned = category.need === 'dismissed' ? null : category.plannedBudget;
      return {
        category,
        planned,
        contracted: catContracted,
        paid: catPaid,
        difference: planned ? planned - catContracted : null,
        ratio: planned ? catContracted / planned : null,
        state: budgetState(planned, catContracted, wedding.nearLimitPct),
        hasContract: cs.length > 0,
        supplierIds: [...new Set(cs.map((c) => c.supplierId))],
        share: contracted > 0 ? catContracted / contracted : 0,
      };
    });
  const pendingCategories = categories.filter((c) => c.category.need === 'required' && !c.hasContract);

  // ── Fornecedores
  const contractsBySupplier = groupBy(s.contracts, (c) => c.supplierId);
  const quotesBySupplier = groupBy(s.quotes, (q) => q.supplierId);
  const suppliers: SupplierView[] = s.suppliers.map((supplier) => {
    const all = contractsBySupplier.get(supplier.id) ?? [];
    const active = all.filter((c) => c.status === 'active');
    const quotes = quotesBySupplier.get(supplier.id) ?? [];
    const q = bestQuote(quotes);
    return {
      supplier,
      status: supplierDisplayStatus(supplier, active),
      favorite: quotes.some((x) => x.favorite && x.status !== 'declined'),
      contracts: all,
      categoryIds: [...new Set([supplier.mainCategoryId, ...active.map((c) => c.categoryId)])],
      quoted: q?.amount ?? null,
      contracted: sumBy(active, (c) => c.totalValue),
      paid: sumBy(all, (c) => contracts.get(c.id)!.paid),
      remaining: sumBy(active, (c) => contracts.get(c.id)!.remaining),
    };
  });
  const contractedSupplierCount = suppliers.filter((v) => v.status === 'contracted' || v.status === 'finished').length;

  // ── Alertas
  const daysToWedding = daysBetween(today, wedding.weddingDate);
  const activeInst = installments.filter((v) => activeIds.has(v.contract.id));
  const alerts: Alert[] = [];
  const overdue = activeInst.filter((v) => v.status === 'overdue');
  if (overdue.length) {
    alerts.push({
      id: 'overdue',
      level: 'critical',
      title: plural(overdue.length, 'pagamento vencido', 'pagamentos vencidos'),
      detail: overdue.map((v) => supplierById.get(v.contract.supplierId)?.name).join(', '),
      amount: sumBy(overdue, (v) => v.remaining),
      href: '#pagamentos',
    });
  }
  const soon = activeInst.filter((v) => v.status !== 'paid' && v.status !== 'overdue' && v.daysUntilDue <= wedding.dueSoonDays);
  if (soon.length) {
    alerts.push({
      id: 'due-soon',
      level: 'warning',
      title: `${plural(soon.length, 'vencimento', 'vencimentos')} nos próximos ${wedding.dueSoonDays} dias`,
      detail: soon.map((v) => supplierById.get(v.contract.supplierId)?.name).join(', '),
      amount: sumBy(soon, (v) => v.remaining),
      href: '#pagamentos',
    });
  }
  for (const c of categories.filter((c) => c.state === 'over')) {
    alerts.push({
      id: `over-${c.category.id}`,
      level: 'warning',
      title: `${c.category.name} acima do orçamento`,
      detail: `${Math.round((c.ratio! - 1) * 100)}% acima do planejado`,
      amount: -c.difference!,
      href: '#orcamento',
    });
  }
  if (totals.commitment * 100 >= wedding.overallAlertPct) {
    alerts.push({
      id: 'commitment',
      level: 'warning',
      title: `${Math.round(totals.commitment * 100)}% do orçamento já comprometido`,
      detail: totals.available >= 0 ? 'Pouca margem para o que falta contratar' : 'Contratado passou do orçamento total',
      href: '#orcamento',
    });
  }
  for (const v of [...contracts.values()].filter((v) => v.unscheduled > 0)) {
    alerts.push({
      id: `unscheduled-${v.contract.id}`,
      level: 'info',
      title: `${supplierById.get(v.contract.supplierId)?.name} sem parcelas cadastradas`,
      detail: 'Cadastre o cronograma para entrar no fluxo de pagamentos',
      amount: v.unscheduled,
      href: '#fornecedores',
    });
  }
  const partial = activeInst.filter((v) => v.isPartial);
  for (const v of partial) {
    alerts.push({
      id: `partial-${v.installment.id}`,
      level: 'info',
      title: `${supplierById.get(v.contract.supplierId)?.name}: ${v.installment.label} paga parcialmente`,
      detail: 'Restante ainda em aberto',
      amount: v.remaining,
      href: '#pagamentos',
    });
  }
  if (pendingCategories.length && daysToWedding <= UNCONTRACTED_ALERT_DAYS) {
    alerts.push({
      id: 'uncontracted',
      level: 'info',
      title: `${plural(pendingCategories.length, 'serviço ainda não contratado', 'serviços ainda não contratados')}`,
      detail: pendingCategories.map((c) => c.category.name).join(', '),
      href: '#orcamento',
    });
  }
  alerts.sort((a, b) => ALERT_ORDER[a.level] - ALERT_ORDER[b.level]);

  // ── Quem pagou / forma
  const byPayer = [...groupBy(s.payments, (p) => p.paidBy)].map(([personId, ps]) => ({ personId, amount: sumBy(ps, (p) => p.amount) }));
  const byMethod = [...groupBy(s.payments, (p) => p.method)].map(([method, ps]) => ({
    method: method as PaymentMethod,
    amount: sumBy(ps, (p: Payment) => p.amount),
  }));

  const unscheduledTotal = sumBy([...contracts.values()], (v) => v.unscheduled);

  return {
    today,
    daysToWedding,
    totals,
    contracts,
    installments,
    categories,
    suppliers,
    contractedSupplierCount,
    pendingCategories,
    alerts,
    byPayer,
    byMethod,
    cashflow: (from, to) => buildCashflow(installments, s.payments, activeIds, unscheduledTotal, from, to, today),
  };
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

function sumBy<T>(items: T[], f: (t: T) => number): number {
  let s = 0;
  for (const it of items) s += f(it);
  return s;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
