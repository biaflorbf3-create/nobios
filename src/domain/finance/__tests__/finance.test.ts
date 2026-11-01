import { describe, expect, it } from 'vitest';
import { buildFinance, budgetState, generateSchedule, installmentStatus, installmentStatusText } from '..';
import { createSeed } from '../../../data/mock/seed';
import { addMonths, daysBetween } from '../../../lib/dates';
import { reais } from '../../../lib/money';

const TODAY = '2026-11-01';

describe('status da parcela', () => {
  const s = (amount: number, paid: number, due: string) => installmentStatus(reais(amount), reais(paid), due, TODAY, 7);
  it('paga quando pago ≥ valor', () => expect(s(100, 100, '2026-10-01')).toBe('paid'));
  it('vencida quando passou a data e falta pagar', () => expect(s(100, 0, '2026-10-31')).toBe('overdue'));
  it('vencida mesmo com pagamento parcial', () => expect(s(100, 50, '2026-10-31')).toBe('overdue'));
  it('parcial no prazo', () => expect(s(100, 50, '2026-12-01')).toBe('partial'));
  it('vence hoje conta como em breve', () => expect(s(100, 0, TODAY)).toBe('due-soon'));
  it('vence em 7 dias conta como em breve', () => expect(s(100, 0, '2026-11-08')).toBe('due-soon'));
  it('8 dias = a vencer', () => expect(s(100, 0, '2026-11-09')).toBe('upcoming'));
  it('textos', () => {
    expect(installmentStatusText({ status: 'overdue', daysUntilDue: -4, isPartial: false })).toBe('Vencido há 4 dias');
    expect(installmentStatusText({ status: 'due-soon', daysUntilDue: 4, isPartial: false })).toBe('Vence em 4 dias');
  });
});

describe('estado da categoria', () => {
  it('dentro, próximo, acima, sem orçamento', () => {
    expect(budgetState(reais(10000), reais(8000), 85)).toBe('within');
    expect(budgetState(reais(10000), reais(8700), 85)).toBe('near');
    expect(budgetState(reais(10000), reais(10000), 85)).toBe('near');
    expect(budgetState(reais(5000), reais(6200), 85)).toBe('over');
    expect(budgetState(null, reais(100), 85)).toBe('unbudgeted');
    expect(budgetState(null, 0, 85)).toBe('empty');
  });
});

describe('gerador de parcelas', () => {
  it('entrada + 6 parcelas fecham o total', () => {
    const items = generateSchedule({
      total: reais(15000),
      downPayment: { amount: reais(3000), dueDate: '2026-07-10' },
      count: 6,
      firstDueDate: '2026-11-10',
    });
    expect(items).toHaveLength(7);
    expect(items.reduce((s, i) => s + i.amount, 0)).toBe(reais(15000));
    expect(items[1]).toMatchObject({ label: 'Parcela 1/6', amount: reais(2000), dueDate: '2026-11-10' });
    expect(items[6].dueDate).toBe('2027-04-10');
  });
  it('centavos que sobram vão para a última', () => {
    const items = generateSchedule({ total: 100000, count: 3, firstDueDate: '2026-01-31' });
    expect(items.map((i) => i.amount)).toEqual([33333, 33333, 33334]);
    expect(items.map((i) => i.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});

describe('datas', () => {
  it('faltam 315 dias de 01/11/2026 a 12/09/2027', () => expect(daysBetween(TODAY, '2027-09-12')).toBe(315));
  it('addMonths ajusta fim de mês', () => expect(addMonths('2027-01-31', 1)).toBe('2027-02-28'));
});

describe('painel com os dados fictícios', () => {
  const f = buildFinance(createSeed(), TODAY);

  it('totais coerentes entre si', () => {
    const t = f.totals;
    expect(t.planned).toBe(reais(85000));
    expect(t.contracted).toBe(reais(67170));
    expect(t.paid).toBe(reais(29390));
    // a pagar = Σ por contrato de (valor − pago); aqui igual a contratado − pago (ninguém pagou a mais)
    expect(t.toPay).toBe(t.contracted - t.paid);
    expect(t.available).toBe(t.planned - t.contracted);
    expect(t.commitment).toBeCloseTo(67170 / 85000);
  });

  it('soma das categorias = total contratado (mesmo número em todas as telas)', () => {
    expect(f.categories.reduce((s, c) => s + c.contracted, 0)).toBe(f.totals.contracted);
    expect(f.categories.reduce((s, c) => s + c.paid, 0)).toBe(f.totals.paid);
  });

  it('soma dos fornecedores = total contratado e pago', () => {
    expect(f.suppliers.reduce((s, v) => s + v.contracted, 0)).toBe(f.totals.contracted);
    expect(f.suppliers.reduce((s, v) => s + v.paid, 0)).toBe(f.totals.paid);
    expect(f.suppliers.reduce((s, v) => s + v.remaining, 0)).toBe(f.totals.toPay);
  });

  it('fluxo até o casamento + vencidos + sem data = a pagar', () => {
    const cf = f.cashflow('2026-11-01', '2027-09-30');
    expect(cf.dueInPeriod + cf.overdue + cf.unscheduled).toBe(f.totals.toPay);
    expect(cf.overdue).toBe(reais(1300 + 890));
    expect(cf.unscheduled).toBe(reais(450));
    expect(cf.months[0]).toMatchObject({ key: '2026-11', due: reais(2500 + 1250 + 1500 + 3000 + 980) });
  });

  it('12 contratados, 5 categorias pendentes', () => {
    expect(f.contractedSupplierCount).toBe(12);
    expect(f.pendingCategories.map((c) => c.category.name)).toEqual(['DJ / Banda', 'Papelaria', 'Bolo', 'Lembrancinhas', 'Beleza']);
  });

  it('alertas: vencidos primeiro, categorias acima, contrato sem parcelas, parcial', () => {
    expect(f.alerts[0]).toMatchObject({ id: 'overdue', level: 'critical', title: '2 pagamentos vencidos' });
    const ids = f.alerts.map((a) => a.id);
    expect(ids).toContain('due-soon');
    expect(ids).toContain('over-cat_fotografia');
    expect(ids).toContain('over-cat_vestido');
    expect(ids).toContain('unscheduled-con_cartorio');
    expect(ids).toContain('partial-ins_clara_2');
    expect(ids).not.toContain('uncontracted'); // a mais de 180 dias do casamento
  });

  it('status dos fornecedores derivado', () => {
    const by = Object.fromEntries(f.suppliers.map((v) => [v.supplier.id, v]));
    expect(by.sup_bella.status).toBe('contracted');
    expect(by.sup_somarte.status).toBe('negotiating');
    expect(by.sup_somarte.favorite).toBe(true);
    expect(by.sup_lumi.categoryIds).toEqual(['cat_fotografia', 'cat_filmagem']);
  });
});

describe('leitura de valores digitados', async () => {
  const { parseMoney } = await import('../../../lib/money');
  it('formatos brasileiros', () => {
    expect(parseMoney('2500')).toBe(250000);
    expect(parseMoney('2.500')).toBe(250000);
    expect(parseMoney('2.500,00')).toBe(250000);
    expect(parseMoney('2500,5')).toBe(250050);
    expect(parseMoney('R$ 1.250,90')).toBe(125090);
    expect(parseMoney('1.250.000')).toBe(125000000);
    expect(parseMoney('12.5')).toBe(1250);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
});

describe('gravação via DataSource (mock)', async () => {
  const { MockDataSource } = await import('../../../data/sources/MockDataSource');
  it('contrato + parcelas num commit, refletido nos números', async () => {
    const ds = new MockDataSource();
    const before = buildFinance(await ds.load(), TODAY);
    const now = '2026-11-01T00:00:00Z';
    const contract = { id: 'con_test', supplierId: 'sup_somarte', categoryId: 'cat_musica', title: 'DJ', totalValue: reais(4500), contractDate: TODAY, status: 'active', createdAt: now, updatedAt: now };
    const items = generateSchedule({ total: reais(4500), downPayment: { amount: reais(1350), dueDate: TODAY }, count: 3, firstDueDate: '2026-12-01' });
    const after = buildFinance(
      await ds.commit(
        [
          { op: 'put', entity: 'contracts', record: contract },
          ...items.map((it, i) => ({ op: 'put' as const, entity: 'installments' as const, record: { id: `ins_t${i}`, contractId: 'con_test', ...it, createdAt: now, updatedAt: now } })),
        ],
        'teste',
      ),
      TODAY,
    );
    expect(after.totals.contracted - before.totals.contracted).toBe(reais(4500));
    expect(after.contractedSupplierCount).toBe(before.contractedSupplierCount + 1);
    expect(after.pendingCategories.map((c) => c.category.id)).not.toContain('cat_musica');
    expect(after.suppliers.find((v) => v.supplier.id === 'sup_somarte')!.status).toBe('contracted');
    expect(after.contracts.get('con_test')!.unscheduled).toBe(0);
  });
  it('cancelar contrato tira do contratado e do a pagar, mantém o pago', async () => {
    const ds = new MockDataSource();
    const s = await ds.load();
    const c = s.contracts.find((x) => x.id === 'con_bella')!;
    const before = buildFinance(s, TODAY);
    const after = buildFinance(await ds.commit([{ op: 'put', entity: 'contracts', record: { ...c, status: 'cancelled' } }], 't'), TODAY);
    expect(before.totals.contracted - after.totals.contracted).toBe(reais(15000));
    expect(before.totals.toPay - after.totals.toPay).toBe(reais(7500));
    expect(after.totals.paid).toBe(before.totals.paid);
  });
});

describe('registrar pagamento: parcial, desconto, juros', async () => {
  const { planPayment } = await import('../payments');
  const { MockDataSource } = await import('../../../data/sources/MockDataSource');
  const ds = new MockDataSource();
  const s = await ds.load();
  const inst = s.installments.find((i) => i.id === 'ins_bella_4')!; // 2.500, sem pagamento
  const con = s.contracts.find((c) => c.id === 'con_bella')!;

  it('valor exato não ajusta nada', () => expect(planPayment(inst, con, 0, reais(2500), false)).toEqual({ mode: 'exact' }));
  it('parcial mantém o restante em aberto', () => expect(planPayment(inst, con, 0, reais(1000), false).mode).toBe('partial'));
  it('desconto reduz parcela e contrato', () => {
    const p = planPayment(inst, con, 0, reais(2300), true);
    expect(p.mode).toBe('discount');
    expect(p.installment!.amount).toBe(reais(2300));
    expect(p.contract!.totalValue).toBe(reais(14800));
  });
  it('juros aumentam parcela e contrato', () => {
    const p = planPayment(inst, con, 0, reais(2550), false);
    expect(p.mode).toBe('surcharge');
    expect(p.installment!.amount).toBe(reais(2550));
    expect(p.contract!.totalValue).toBe(reais(15050));
  });
  it('desconto no restante de parcela já parcialmente paga', () => {
    // vestido 2/3: 1.890, pago 1.000, restante 890 → paga 800 quitando
    const i2 = s.installments.find((i) => i.id === 'ins_clara_2')!;
    const c2 = s.contracts.find((c) => c.id === 'con_clara')!;
    const p = planPayment(i2, c2, reais(1000), reais(800), true);
    expect(p.installment!.amount).toBe(reais(1800));
    expect(p.contract!.totalValue).toBe(reais(5310));
  });
  it('depois do registro com desconto, parcela fica paga e a pagar fecha', async () => {
    const before = buildFinance(s, TODAY);
    const plan = planPayment(inst, con, 0, reais(2300), true);
    const now = 'x';
    const next = await ds.commit(
      [
        { op: 'put', entity: 'payments', record: { id: 'pay_t', contractId: con.id, installmentId: inst.id, amount: reais(2300), paidAt: TODAY, method: 'pix', paidBy: 'per_bia', createdAt: now, updatedAt: now } },
        { op: 'put', entity: 'installments', record: plan.installment! as never },
        { op: 'put', entity: 'contracts', record: plan.contract! as never },
      ],
      't',
    );
    const after = buildFinance(next, TODAY);
    expect(after.installments.find((v) => v.installment.id === inst.id)!.status).toBe('paid');
    expect(after.totals.contracted).toBe(before.totals.contracted - reais(200));
    expect(after.totals.paid).toBe(before.totals.paid + reais(2300));
    expect(after.totals.toPay).toBe(before.totals.toPay - reais(2500));
    expect(after.contracts.get(con.id)!.unscheduled).toBe(0);
  });
});

describe('categorias e situação', async () => {
  const { MockDataSource } = await import('../../../data/sources/MockDataSource');
  it('dispensar categoria tira das pendências e do distribuído', async () => {
    const ds = new MockDataSource();
    const s = await ds.load();
    const bolo = s.categories.find((c) => c.id === 'cat_bolo')!;
    const before = buildFinance(s, TODAY);
    const after = buildFinance(await ds.commit([{ op: 'put', entity: 'categories', record: { ...bolo, need: 'dismissed' } as never }], 't'), TODAY);
    expect(after.pendingCategories.length).toBe(before.pendingCategories.length - 1);
    expect(after.totals.allocated).toBe(before.totals.allocated - reais(1200));
    expect(after.totals.contracted).toBe(before.totals.contracted);
  });
  it('excluir categoria movendo contratos mantém o total contratado', async () => {
    const ds = new MockDataSource();
    const s = await ds.load();
    const before = buildFinance(s, TODAY);
    const moves = [
      ...s.contracts.filter((c) => c.categoryId === 'cat_filmagem').map((c) => ({ op: 'put' as const, entity: 'contracts' as const, record: { ...c, categoryId: 'cat_fotografia' } as never })),
      { op: 'delete' as const, entity: 'categories' as const, id: 'cat_filmagem' },
    ];
    const after = buildFinance(await ds.commit(moves, 't'), TODAY);
    expect(after.totals.contracted).toBe(before.totals.contracted);
    expect(after.categories.find((c) => c.category.id === 'cat_fotografia')!.contracted).toBe(reais(6200 + 3800));
    expect(after.categories.reduce((s, c) => s + c.contracted, 0)).toBe(after.totals.contracted);
  });
});

describe('propostas e despesa rápida', async () => {
  const { MockDataSource } = await import('../../../data/sources/MockDataSource');
  it('contratar proposta: aceita a escolhida, descarta as outras, categoria sai das pendências', async () => {
    const ds = new MockDataSource();
    const s = await ds.load();
    const chosen = s.quotes.find((q) => q.id === 'quo_somarte')!;
    const others = s.quotes.filter((q) => q.categoryId === 'cat_musica' && q.id !== chosen.id);
    const now = 'x';
    const contract = { id: 'con_dj', supplierId: chosen.supplierId, categoryId: 'cat_musica', title: 'DJ', totalValue: chosen.amount, contractDate: TODAY, status: 'active', quoteId: chosen.id, createdAt: now, updatedAt: now };
    const next = await ds.commit(
      [
        { op: 'put', entity: 'contracts', record: contract as never },
        { op: 'put', entity: 'quotes', record: { ...chosen, status: 'accepted', contractId: 'con_dj' } as never },
        ...others.map((q) => ({ op: 'put' as const, entity: 'quotes' as const, record: { ...q, status: 'declined', favorite: false } as never })),
      ],
      't',
    );
    const f = buildFinance(next, TODAY);
    expect(next.quotes.filter((q) => q.categoryId === 'cat_musica' && q.status === 'open')).toHaveLength(0);
    expect(f.pendingCategories.map((c) => c.category.id)).not.toContain('cat_musica');
    expect(f.categories.find((c) => c.category.id === 'cat_musica')!.contracted).toBe(reais(4500));
  });
  it('despesa rápida paga: contratado e pago sobem igual, a pagar não muda', async () => {
    const ds = new MockDataSource();
    const before = buildFinance(await ds.load(), TODAY);
    const now = 'x';
    const next = await ds.commit(
      [
        { op: 'put', entity: 'suppliers', record: { id: 'sup_loja', name: 'Loja', mainCategoryId: 'cat_vestido', pipelineStatus: 'negotiating', delivered: false, createdAt: now, updatedAt: now } as never },
        { op: 'put', entity: 'contracts', record: { id: 'con_sap', supplierId: 'sup_loja', categoryId: 'cat_vestido', title: 'Sapato', totalValue: reais(650), contractDate: TODAY, status: 'active', createdAt: now, updatedAt: now } as never },
        { op: 'put', entity: 'installments', record: { id: 'ins_sap', contractId: 'con_sap', label: 'Pagamento único', sequence: 1, amount: reais(650), dueDate: TODAY, createdAt: now, updatedAt: now } as never },
        { op: 'put', entity: 'payments', record: { id: 'pay_sap', contractId: 'con_sap', installmentId: 'ins_sap', amount: reais(650), paidAt: TODAY, method: 'credit', paidBy: 'per_bia', createdAt: now, updatedAt: now } as never },
      ],
      't',
    );
    const after = buildFinance(next, TODAY);
    expect(after.totals.contracted - before.totals.contracted).toBe(reais(650));
    expect(after.totals.paid - before.totals.paid).toBe(reais(650));
    expect(after.totals.toPay).toBe(before.totals.toPay);
    expect(after.suppliers.find((v) => v.supplier.id === 'sup_loja')!.status).toBe('contracted');
  });
});
