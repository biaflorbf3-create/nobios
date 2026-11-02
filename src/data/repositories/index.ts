import type { Category, Contract, Installment, Payment, Person, Quote, Supplier, Task, Wedding } from '../../domain/types';
import type { AnyRecord, Change } from '../DataSource';
import { dataSource } from '../sources';
import { createRepository } from './createRepository';

const put = (entity: Change['entity'], record: unknown): Change => ({ op: 'put', entity, record: record as AnyRecord });

export const categoryRepository = {
  ...createRepository(dataSource, 'categories'),
  save(category: Category) {
    return dataSource.commit([put('categories', category)], `Salvar categoria: ${category.name}`);
  },
  /**
   * Exclui a categoria. Se houver contratos, propostas ou fornecedores ligados a ela,
   * eles são movidos para `moveTo` no mesmo commit; sem destino, a exclusão é bloqueada.
   */
  async remove(id: string, moveTo?: string) {
    const s = await dataSource.load();
    const contracts = s.contracts.filter((c) => c.categoryId === id);
    const quotes = s.quotes.filter((q) => q.categoryId === id);
    const suppliers = s.suppliers.filter((x) => x.mainCategoryId === id);
    const linked = contracts.length + quotes.length + suppliers.length;
    if (linked && !moveTo) throw new Error('Escolha para qual categoria mover os contratos e fornecedores.');
    return dataSource.commit(
      [
        ...contracts.map((c) => put('contracts', { ...c, categoryId: moveTo })),
        ...quotes.map((q) => put('quotes', { ...q, categoryId: moveTo })),
        ...suppliers.map((x) => put('suppliers', { ...x, mainCategoryId: moveTo })),
        { op: 'delete' as const, entity: 'categories' as const, id },
      ],
      'Excluir categoria',
    );
  },
};
export const quoteRepository = {
  ...createRepository(dataSource, 'quotes'),
  save(quote: Quote) {
    return dataSource.commit([put('quotes', quote)], 'Salvar proposta');
  },
  /** proposta de um fornecedor ainda não cadastrado: cria os dois juntos */
  saveWithNewSupplier(quote: Quote, supplier: Supplier) {
    return dataSource.commit([put('suppliers', supplier), put('quotes', quote)], `Nova proposta: ${supplier.name}`);
  },
  remove(id: string) {
    return dataSource.commit([{ op: 'delete', entity: 'quotes', id }], 'Excluir proposta');
  },
};

/**
 * Despesa rápida (compra à vista ou de parcela única):
 * fornecedor (se novo) + contrato + parcela + pagamento (se já pago), num único commit.
 */
export const expenseRepository = {
  quick(input: { supplier: Supplier; isNewSupplier: boolean; contract: Contract; installment: Installment; payment: Payment | null }) {
    return dataSource.commit(
      [
        ...(input.isNewSupplier ? [put('suppliers', input.supplier)] : []),
        put('contracts', input.contract),
        put('installments', input.installment),
        ...(input.payment ? [put('payments', input.payment)] : []),
      ],
      `Despesa rápida: ${input.contract.title}`,
    );
  },
};
export const personRepository = {
  ...createRepository(dataSource, 'people'),
  save(person: Person) {
    return dataSource.commit([put('people', person)], `Salvar pessoa: ${person.name}`);
  },
  /** Com pagamentos registrados, a pessoa é desativada (o histórico continua); sem, é excluída */
  async removeOrDeactivate(id: string) {
    const s = await dataSource.load();
    const p = s.people.find((x) => x.id === id)!;
    if (s.payments.some((x) => x.paidBy === id) || s.tasks.some((t) => t.assigneeId === id)) return dataSource.commit([put('people', { ...p, active: false })], 'Desativar pessoa');
    return dataSource.commit([{ op: 'delete', entity: 'people', id }], 'Excluir pessoa');
  },
};

export const supplierRepository = {
  ...createRepository(dataSource, 'suppliers'),
  /** Excluir só é permitido sem contratos; com contratos, o caminho é cancelar */
  async removeSafe(id: string) {
    const s = await dataSource.load();
    if (s.contracts.some((c) => c.supplierId === id)) throw new Error('Este fornecedor tem contrato. Cancele o contrato em vez de excluir.');
    const quotes = s.quotes.filter((q) => q.supplierId === id);
    return dataSource.commit(
      [{ op: 'delete', entity: 'suppliers', id }, ...quotes.map((q) => ({ op: 'delete' as const, entity: 'quotes' as const, id: q.id }))],
      'Excluir fornecedor',
    );
  },
  save(supplier: Supplier) {
    return dataSource.commit([put('suppliers', supplier)], `Salvar fornecedor: ${supplier.name}`);
  },
  /** fornecedor + valor da proposta (cria ou atualiza a proposta da categoria principal) num commit */
  saveWithQuote(supplier: Supplier, quote: Quote | null) {
    return dataSource.commit(
      [put('suppliers', supplier), ...(quote ? [put('quotes', quote)] : [])],
      `Salvar fornecedor: ${supplier.name}`,
    );
  },
};

export const contractRepository = {
  ...createRepository(dataSource, 'contracts'),
  save(contract: Contract) {
    return dataSource.commit([put('contracts', contract)], `Salvar contrato: ${contract.title}`);
  },
  /** contrato + parcelas num único commit */
  createWithInstallments(contract: Contract, installments: Installment[], acceptedQuote: Quote | null = null, declinedQuotes: Quote[] = []) {
    return dataSource.commit(
      [
        put('contracts', contract),
        ...installments.map((i) => put('installments', i)),
        ...(acceptedQuote ? [put('quotes', acceptedQuote)] : []),
        ...declinedQuotes.map((q) => put('quotes', { ...q, status: 'declined', favorite: false })),
      ],
      `Novo contrato: ${contract.title}`,
    );
  },
  /** substitui parcelas sem pagamento por um novo cronograma */
  async replaceSchedule(contractId: string, installments: Installment[]) {
    const s = await dataSource.load();
    const paidIds = new Set(s.payments.map((p) => p.installmentId));
    const removable = s.installments.filter((i) => i.contractId === contractId && !paidIds.has(i.id));
    return dataSource.commit(
      [
        ...removable.map((i) => ({ op: 'delete' as const, entity: 'installments' as const, id: i.id })),
        ...installments.map((i) => put('installments', i)),
      ],
      'Gerar cronograma',
    );
  },
};

export const installmentRepository = {
  ...createRepository(dataSource, 'installments'),
  save(installment: Installment) {
    return dataSource.commit([put('installments', installment)], `Salvar parcela: ${installment.label}`);
  },
  /** Excluir parcela com pagamento é bloqueado: primeiro estorna-se o pagamento */
  async removeSafe(id: string) {
    const s = await dataSource.load();
    if (s.payments.some((p) => p.installmentId === id)) throw new Error('Esta parcela já tem pagamento. Estorne o pagamento antes de excluir.');
    return dataSource.commit([{ op: 'delete', entity: 'installments', id }], 'Excluir parcela');
  },
};

export const paymentRepository = {
  ...createRepository(dataSource, 'payments'),
  /** pagamento + eventuais ajustes (desconto/juros) na parcela e no contrato, num único commit */
  register(payment: Payment, adjustments: { installment?: Installment; contract?: Contract } = {}) {
    return dataSource.commit(
      [
        put('payments', payment),
        ...(adjustments.installment ? [put('installments', adjustments.installment)] : []),
        ...(adjustments.contract ? [put('contracts', adjustments.contract)] : []),
      ],
      'Registrar pagamento',
    );
  },
  /** estorno: remove o pagamento; a parcela volta a ficar em aberto */
  reverse(id: string) {
    return dataSource.commit([{ op: 'delete', entity: 'payments', id }], 'Estornar pagamento');
  },
};

export const taskRepository = {
  ...createRepository(dataSource, 'tasks'),
  save(task: Task) {
    return dataSource.commit([put('tasks', task)], `Salvar tarefa: ${task.title}`);
  },
  remove(id: string) {
    return dataSource.commit([{ op: 'delete', entity: 'tasks', id }], 'Excluir tarefa');
  },
};

export const weddingRepository = {
  async get() {
    return (await dataSource.load()).wedding;
  },
  save(wedding: Wedding) {
    return dataSource.commit([put('wedding', wedding)], 'Salvar dados do casamento');
  },
};

export const resetDemoData = async () => {
  const src = dataSource as { reset?: () => Promise<import('../../domain/types').Snapshot> };
  if (!src.reset) throw new Error('Disponível só com dados de exemplo');
  return src.reset();
};
