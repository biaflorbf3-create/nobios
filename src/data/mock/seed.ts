/**
 * Dados fictícios realistas do casamento Bia & Vini.
 * Cobrem todos os estados visuais: pagos, parciais, vencidos, futuros, acima do orçamento,
 * contrato sem parcelas, fornecedor com dois contratos, propostas concorrentes e categorias pendentes.
 */
import type {
  Category,
  CategoryNeed,
  Contract,
  Installment,
  Payment,
  PaymentMethod,
  Person,
  Quote,
  Snapshot,
  Supplier,
  Task,
} from '../../domain/types';
import { reais } from '../../lib/money';

const T = '2026-10-31T12:00:00.000Z';
const audit = { createdAt: T, updatedAt: T };

// ── Pessoas que pagam
const people: Person[] = [
  { id: 'per_bia', name: 'Bia', color: '#C084FC', sortOrder: 1, active: true },
  { id: 'per_vini', name: 'Vini', color: '#4A453E', sortOrder: 2, active: true },
  { id: 'per_casal', name: 'Bia & Vini', color: '#7A6A55', sortOrder: 3, active: true },
  { id: 'per_pais_bia', name: 'Pais da Bia', color: '#8B5CF6', sortOrder: 4, active: true },
  { id: 'per_pais_vini', name: 'Pais do Vini', color: '#5C6F80', sortOrder: 5, active: true },
  { id: 'per_outro', name: 'Outro', color: '#9A9287', sortOrder: 6, active: true },
];

// ── Categorias: [id, nome, planejado (R$), necessidade]
const catRows: [string, string, number | null, CategoryNeed][] = [
  ['espaco', 'Espaço', 13500, 'required'],
  ['buffet', 'Buffet', 17000, 'required'],
  ['bebidas', 'Bebidas', 4500, 'required'],
  ['decoracao', 'Decoração', 11000, 'required'],
  ['fotografia', 'Fotografia', 5000, 'required'],
  ['filmagem', 'Filmagem', 4500, 'required'],
  ['musica', 'DJ / Banda', 4500, 'required'],
  ['cerimonial', 'Cerimonial', 5000, 'required'],
  ['vestido', 'Vestido', 5000, 'required'],
  ['terno', 'Terno', 2000, 'required'],
  ['aliancas', 'Alianças', 3500, 'required'],
  ['convites', 'Convites', 1200, 'required'],
  ['papelaria', 'Papelaria', 600, 'required'],
  ['bolo', 'Bolo', 1200, 'required'],
  ['doces', 'Doces', 2600, 'required'],
  ['lembrancinhas', 'Lembrancinhas', 800, 'required'],
  ['beleza', 'Beleza', 1500, 'required'],
  ['transporte', 'Transporte', 700, 'optional'],
  ['igreja', 'Igreja', null, 'dismissed'],
  ['cartorio', 'Cartório', 500, 'required'],
  ['luademel', 'Lua de mel', null, 'optional'],
  ['hospedagem', 'Hospedagem', null, 'optional'],
  ['outros', 'Outros', 0, 'optional'],
];
const categories: Category[] = catRows.map(([id, name, planned, need], i) => ({
  id: `cat_${id}`,
  name,
  plannedBudget: planned === null ? null : reais(planned),
  need,
  sortOrder: i + 1,
  ...audit,
}));

// ── Fornecedores
function sup(id: string, name: string, cat: string, extra: Partial<Supplier> = {}): Supplier {
  return { id: `sup_${id}`, name, mainCategoryId: `cat_${cat}`, pipelineStatus: 'negotiating', delivered: false, ...audit, ...extra };
}
const suppliers: Supplier[] = [
  sup('jardim', 'Espaço Jardim Imperial', 'espaco', {
    contactName: 'Renata Albuquerque', phone: '(11) 4521-8890', whatsapp: '(11) 98812-4410', email: 'eventos@jardimimperial.com.br',
    instagram: '@espacojardimimperial', notes: 'Inclui gerador, estacionamento com manobrista e suíte da noiva. Visita técnica 60 dias antes.',
  }),
  sup('bella', 'Buffet Bella', 'buffet', {
    contactName: 'Mariana Costa', phone: '(11) 3456-2210', whatsapp: '(11) 99102-3344', email: 'mariana@buffetbella.com.br',
    instagram: '@buffetbella', notes: 'Degustação em 15/03. Cardápio final até 60 dias antes. Inclui 2 garçons extras.',
  }),
  sup('lumi', 'Studio Lumi Fotografia', 'fotografia', {
    contactName: 'Pedro Lumi', whatsapp: '(11) 98765-1200', email: 'contato@studiolumi.com.br', instagram: '@studiolumi',
    notes: 'Foto e filme no mesmo estúdio. Ensaio pré-wedding incluso.',
  }),
  sup('floral', 'Ateliê Floral', 'decoracao', {
    contactName: 'Helena Prado', whatsapp: '(11) 97654-3321', instagram: '@ateliefloral', notes: 'Paleta: off-white, verde-oliva e champagne.',
  }),
  sup('essenza', 'Cerimonial Essenza', 'cerimonial', {
    contactName: 'Carla Menezes', whatsapp: '(11) 99877-6655', email: 'carla@essenza.com.br', notes: 'Quitado. Reunião de alinhamento a cada 2 meses.',
  }),
  sup('lumiere', 'Doces Lumière', 'doces', { contactName: 'Juliana Reis', whatsapp: '(11) 98001-2233', instagram: '@doceslumiere' }),
  sup('aurora', 'Bebidas Aurora', 'bebidas', { contactName: 'Thiago Aurora', whatsapp: '(11) 97700-1188', notes: 'Open bar 6h, 150 pessoas. Drinks autorais inclusos.' }),
  sup('aurum', 'Joalheria Aurum', 'aliancas', { contactName: 'Sr. Augusto', phone: '(11) 3088-4400', notes: 'Ouro 18k, 4mm. Gravação interna inclusa.' }),
  sup('clara', 'Maison Clara Noivas', 'vestido', { contactName: 'Clara Vasconcelos', whatsapp: '(11) 99456-7788', notes: 'Provas: março, junho e agosto.' }),
  sup('papel', 'Papel & Afeto', 'convites', { contactName: 'Lívia', whatsapp: '(11) 98234-5566', instagram: '@papeleafeto', notes: '120 convites com envelope de linho.' }),
  sup('cartorio', 'Cartório do 2º Subdistrito', 'cartorio', { phone: '(11) 3211-0099', notes: 'Habilitação de casamento + celebração no local.' }),
  sup('bernardi', 'Alfaiataria Bernardi', 'terno', { contactName: 'Marco Bernardi', whatsapp: '(11) 97123-4455', notes: 'Terno sob medida, azul-marinho.' }),
  // Em negociação / ainda não contratados
  sup('somarte', 'Som & Arte Eventos', 'musica', {
    contactName: 'Rafael Moura', whatsapp: '(11) 98555-1010', instagram: '@someartevents', pipelineStatus: 'negotiating',
    notes: 'DJ + iluminação cênica. Pediram 10% de desconto à vista.',
  }),
  sup('vinil', 'Banda Vinil 70', 'musica', { contactName: 'Bruno', whatsapp: '(11) 99333-2020', pipelineStatus: 'quoted', notes: 'Banda ao vivo, 4 músicos, 3 sets.' }),
  sup('leo', 'DJ Leo Martins', 'musica', { whatsapp: '(11) 98777-3030', pipelineStatus: 'quoted' }),
  sup('cassis', 'Ateliê do Bolo Cassis', 'bolo', { contactName: 'Fernanda', whatsapp: '(11) 97444-5050', pipelineStatus: 'negotiating', notes: 'Degustação marcada.' }),
  sup('belle', 'Studio Belle Noiva', 'beleza', { contactName: 'Patrícia', whatsapp: '(11) 99666-7070', pipelineStatus: 'quoted', notes: 'Cabelo e maquiagem noiva + 2 madrinhas.' }),
  sup('mimos', 'Mimos de Afeto', 'lembrancinhas', { pipelineStatus: 'researching' }),
];

// ── Propostas
function quo(id: string, supplier: string, cat: string, amount: number, extra: Partial<Quote> = {}): Quote {
  return { id: `quo_${id}`, supplierId: `sup_${supplier}`, categoryId: `cat_${cat}`, amount: reais(amount), favorite: false, status: 'open', ...audit, ...extra };
}
const quotes: Quote[] = [
  quo('somarte', 'somarte', 'musica', 4500, { favorite: true, paymentTerms: '30% entrada + 3x', details: 'DJ 6h, iluminação cênica, pista de LED', receivedAt: '2026-10-08' }),
  quo('vinil', 'vinil', 'musica', 5200, { paymentTerms: '50% entrada + 50% na semana', details: 'Banda 4 músicos, 3 sets de 50 min', receivedAt: '2026-10-12' }),
  quo('leo', 'leo', 'musica', 3900, { paymentTerms: 'À vista com 5% de desconto', details: 'DJ 5h, som básico', receivedAt: '2026-10-15' }),
  quo('cassis', 'cassis', 'bolo', 1350, { favorite: true, paymentTerms: '2x', details: 'Bolo 3 andares, massa de pistache', receivedAt: '2026-10-20' }),
  quo('belle', 'belle', 'beleza', 1600, { paymentTerms: '50% + 50%', receivedAt: '2026-10-22' }),
  quo('bella', 'bella', 'buffet', 15800, { status: 'accepted', contractId: 'con_bella', receivedAt: '2026-06-28' }),
  quo('lumi', 'lumi', 'fotografia', 6500, { status: 'accepted', contractId: 'con_lumi_foto', receivedAt: '2026-06-02' }),
];

// ── Contratos, parcelas e pagamentos
const contracts: Contract[] = [];
const installments: Installment[] = [];
const payments: Payment[] = [];

interface Inst {
  label: string;
  amount: number;
  due: string;
  /** pagamentos: [data, valor, quem, forma] */
  paid?: [string, number, string, PaymentMethod][];
}

function contract(
  id: string,
  supplier: string,
  cat: string,
  title: string,
  total: number,
  date: string,
  method: PaymentMethod,
  items: Inst[],
  extra: Partial<Contract> = {},
) {
  const cid = `con_${id}`;
  contracts.push({
    id: cid, supplierId: `sup_${supplier}`, categoryId: `cat_${cat}`, title, totalValue: reais(total), contractDate: date,
    paymentMethodDefault: method, status: 'active', ...audit, ...extra,
  });
  items.forEach((it, i) => {
    const iid = `ins_${id}_${i + 1}`;
    installments.push({ id: iid, contractId: cid, label: it.label, sequence: i + 1, amount: reais(it.amount), dueDate: it.due, ...audit });
    (it.paid ?? []).forEach(([paidAt, amount, who, how], k) => {
      payments.push({
        id: `pay_${id}_${i + 1}_${k + 1}`, contractId: cid, installmentId: iid, amount: reais(amount), paidAt,
        method: how, paidBy: `per_${who}`, ...audit,
      });
    });
  });
}

// Espaço — R$ 12.000 · pago 9.000
contract('jardim', 'jardim', 'espaco', 'Locação do espaço + cerimônia ao ar livre', 12000, '2026-03-15', 'transfer', [
  { label: 'Entrada', amount: 3000, due: '2026-03-15', paid: [['2026-03-15', 3000, 'pais_bia', 'transfer']] },
  { label: 'Parcela 1/6', amount: 1500, due: '2026-07-15', paid: [['2026-07-14', 1500, 'casal', 'pix']] },
  { label: 'Parcela 2/6', amount: 1500, due: '2026-08-15', paid: [['2026-08-15', 1500, 'casal', 'pix']] },
  { label: 'Parcela 3/6', amount: 1500, due: '2026-09-15', paid: [['2026-09-15', 1500, 'vini', 'pix']] },
  { label: 'Parcela 4/6', amount: 1500, due: '2026-10-15', paid: [['2026-10-14', 1500, 'bia', 'pix']] },
  { label: 'Parcela 5/6', amount: 1500, due: '2026-11-15' },
  { label: 'Parcela 6/6', amount: 1500, due: '2026-12-15' },
], { documentUrl: 'https://drive.google.com/', paymentTerms: 'Entrada + 6x mensais' });

// Buffet — R$ 15.000 · pago 7.500
contract('bella', 'bella', 'buffet', 'Buffet completo · 150 pessoas', 15000, '2026-07-10', 'pix', [
  { label: 'Entrada', amount: 2500, due: '2026-08-10', paid: [['2026-08-10', 2500, 'vini', 'pix']] },
  { label: 'Parcela 2/6', amount: 2500, due: '2026-09-10', paid: [['2026-09-09', 2500, 'pais_bia', 'transfer']] },
  { label: 'Parcela 3/6', amount: 2500, due: '2026-10-10', paid: [['2026-10-10', 2500, 'bia', 'pix']] },
  { label: 'Parcela 4/6', amount: 2500, due: '2026-11-05' },
  { label: 'Parcela 5/6', amount: 2500, due: '2026-12-10' },
  { label: 'Parcela 6/6', amount: 2500, due: '2027-01-10' },
], { quoteId: 'quo_bella', documentUrl: 'https://drive.google.com/', paymentTerms: 'Entrada + 5x' });

// Fotografia — R$ 6.200 (acima do planejado de 5.000)
contract('lumi_foto', 'lumi', 'fotografia', 'Fotografia · cobertura completa + ensaio', 6200, '2026-06-20', 'pix', [
  { label: 'Entrada', amount: 1250, due: '2026-06-20', paid: [['2026-06-20', 1250, 'bia', 'pix']] },
  { label: 'Parcela 2/4', amount: 1250, due: '2026-11-10' },
  { label: 'Parcela 3/4', amount: 1850, due: '2027-03-10' },
  { label: 'Parcela 4/4', amount: 1850, due: '2027-08-10' },
], { quoteId: 'quo_lumi', paymentTerms: 'Entrada + 3x' });

// Filmagem — mesmo fornecedor, outra categoria
contract('lumi_film', 'lumi', 'filmagem', 'Filme do casamento · teaser + longa', 3800, '2026-06-20', 'pix', [
  { label: 'Entrada', amount: 800, due: '2026-06-20', paid: [['2026-06-20', 800, 'vini', 'pix']] },
  { label: 'Parcela 2/4', amount: 1000, due: '2027-01-10' },
  { label: 'Parcela 3/4', amount: 1000, due: '2027-04-10' },
  { label: 'Parcela 4/4', amount: 1000, due: '2027-07-10' },
]);

// Decoração — R$ 8.700 · entrada só em 18/11
contract('floral', 'floral', 'decoracao', 'Decoração cerimônia + recepção', 8700, '2026-10-05', 'pix', [
  { label: 'Entrada', amount: 3000, due: '2026-11-18' },
  { label: 'Parcela 2/4', amount: 1900, due: '2027-03-18' },
  { label: 'Parcela 3/4', amount: 1900, due: '2027-06-18' },
  { label: 'Parcela 4/4', amount: 1900, due: '2027-08-18' },
]);

// Cerimonial — quitado
contract('essenza', 'essenza', 'cerimonial', 'Assessoria completa', 4200, '2026-02-10', 'pix', [
  ...[3, 4, 5, 6, 7, 8].map((m, i): Inst => ({
    label: `Parcela ${i + 1}/6`, amount: 700, due: `2026-0${m}-10`,
    paid: [[`2026-0${m}-10`, 700, i % 2 ? 'vini' : 'bia', 'pix']],
  })),
]);

// Doces — R$ 2.100
contract('lumiere', 'lumiere', 'doces', '600 doces finos', 2100, '2026-10-02', 'pix', [
  { label: 'Entrada', amount: 630, due: '2026-10-02', paid: [['2026-10-02', 630, 'bia', 'pix']] },
  { label: 'Restante', amount: 1470, due: '2027-08-30' },
]);

// Bebidas — parcela 1/3 vencida
contract('aurora', 'aurora', 'bebidas', 'Open bar 6h · 150 pessoas', 3800, '2026-09-28', 'boleto', [
  { label: 'Parcela 1/3', amount: 1300, due: '2026-10-28' },
  { label: 'Parcela 2/3', amount: 1250, due: '2026-12-28' },
  { label: 'Parcela 3/3', amount: 1250, due: '2027-02-28' },
]);

// Alianças — à vista no cartão
contract('aurum', 'aurum', 'aliancas', 'Par de alianças ouro 18k', 2890, '2026-08-22', 'credit', [
  { label: 'Pagamento único', amount: 2890, due: '2026-08-22', paid: [['2026-08-22', 2890, 'casal', 'credit']] },
]);

// Vestido — parcela 2/3 paga parcialmente e vencida (R$ 5.400, acima de 5.000)
contract('clara', 'clara', 'vestido', 'Vestido sob medida + véu', 5400, '2026-05-12', 'transfer', [
  { label: 'Entrada', amount: 1620, due: '2026-05-12', paid: [['2026-05-12', 1620, 'pais_bia', 'transfer']] },
  { label: 'Parcela 2/3', amount: 1890, due: '2026-10-12', paid: [['2026-10-12', 1000, 'pais_bia', 'transfer']] },
  { label: 'Parcela 3/3', amount: 1890, due: '2027-07-12' },
]);

// Convites — pagamento único em 25/11
contract('papel', 'papel', 'convites', '120 convites + envelopes de linho', 980, '2026-10-20', 'pix', [
  { label: 'Pagamento único', amount: 980, due: '2026-11-25' },
]);

// Cartório — contrato sem parcelas (gera alerta)
contract('cartorio', 'cartorio', 'cartorio', 'Habilitação + celebração no local', 450, '2026-10-15', 'boleto', []);

// Terno
contract('bernardi', 'bernardi', 'terno', 'Terno sob medida', 1650, '2026-10-25', 'pix', [
  { label: 'Entrada', amount: 500, due: '2026-10-25', paid: [['2026-10-25', 500, 'vini', 'debit']] },
  { label: 'Parcela 2/3', amount: 575, due: '2027-06-25' },
  { label: 'Parcela 3/3', amount: 575, due: '2027-08-25' },
]);

// ── Tarefas
const tasks: Task[] = [
  { id: 'tsk_degustacao', title: 'Agendar degustação do buffet', assigneeId: 'per_bia', notes: 'Levar a lista de restrições alimentares dos convidados.\nPerguntar sobre opção vegana.', dueDate: '2026-11-20', done: false, ...audit },
  { id: 'tsk_lista', title: 'Fechar lista de convidados', assigneeId: 'per_casal', notes: 'Limite de 150 pessoas pelo contrato do espaço.', dueDate: '2026-10-25', done: false, ...audit },
  { id: 'tsk_cartorio', title: 'Separar documentos para o cartório', assigneeId: 'per_vini', notes: 'Certidões de nascimento atualizadas, RG, comprovante de residência e 2 testemunhas.', dueDate: '2027-06-01', done: false, ...audit },
  { id: 'tsk_padrinhos', title: 'Convidar os padrinhos', assigneeId: 'per_casal', dueDate: null, done: true, doneAt: '2026-10-10', ...audit },
  { id: 'tsk_musicas', title: 'Escolher músicas da cerimônia', assigneeId: null, dueDate: null, done: false, ...audit },
];

export function createSeed(): Snapshot {
  return structuredClone({
    wedding: {
      id: 'wedding',
      coupleName: 'Bia & Vini',
      weddingDate: '2027-09-12',
      totalBudget: reais(85000),
      dueSoonDays: 7,
      nearLimitPct: 85,
      overallAlertPct: 90,
      ...audit,
    },
    categories,
    suppliers,
    quotes,
    contracts,
    installments,
    payments,
    people,
    users: [
      { id: 'usr_bia', name: 'Bia', email: 'bia@example.com', personId: 'per_bia' },
      { id: 'usr_vini', name: 'Vini', email: 'vini@example.com', personId: 'per_vini' },
    ],
    tasks,
  } satisfies Snapshot);
}
