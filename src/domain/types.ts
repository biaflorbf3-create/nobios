/** Valores monetários em centavos inteiros: R$ 2.500,00 = 250000 */
export type Cents = number;
/** Data local 'AAAA-MM-DD' (fuso America/Sao_Paulo) */
export type ISODate = string;
/** Instante ISO completo, usado só em createdAt/updatedAt */
export type Timestamp = string;

interface Audit {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Wedding extends Audit {
  id: 'wedding';
  coupleName: string;
  weddingDate: ISODate;
  totalBudget: Cents;
  /** "vence em breve" = até N dias */
  dueSoonDays: number;
  /** "próximo do limite" a partir de N% do planejado */
  nearLimitPct: number;
  /** alerta de orçamento geral a partir de N% comprometido */
  overallAlertPct: number;
  /** ordem dos blocos do painel (ids de DASHBOARD_BLOCKS); ausente = ordem padrão */
  dashboardOrder?: string[];
}

export type CategoryNeed = 'required' | 'optional' | 'dismissed';

export interface Category extends Audit {
  id: string;
  name: string;
  plannedBudget: Cents | null;
  need: CategoryNeed;
  sortOrder: number;
}

export type PipelineStatus = 'researching' | 'quoted' | 'negotiating' | 'cancelled';

export interface Supplier extends Audit {
  id: string;
  name: string;
  mainCategoryId: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  pipelineStatus: PipelineStatus;
  /** serviço entregue → "Finalizado" */
  delivered: boolean;
  notes?: string;
}

export type QuoteStatus = 'open' | 'accepted' | 'declined';

export interface Quote extends Audit {
  id: string;
  supplierId: string;
  categoryId: string;
  amount: Cents;
  paymentTerms?: string;
  details?: string;
  notes?: string;
  url?: string;
  favorite: boolean;
  status: QuoteStatus;
  contractId?: string;
  receivedAt?: ISODate;
}

export type PaymentMethod = 'pix' | 'transfer' | 'credit' | 'debit' | 'cash' | 'boleto' | 'other';

export interface ContractLink {
  label: string;
  url: string;
}

export interface Contract extends Audit {
  id: string;
  supplierId: string;
  /** a categoria do gasto mora no contrato */
  categoryId: string;
  title: string;
  totalValue: Cents;
  contractDate: ISODate;
  paymentMethodDefault?: PaymentMethod;
  paymentTerms?: string;
  documentUrl?: string;
  links?: ContractLink[];
  status: 'active' | 'cancelled';
  quoteId?: string;
  notes?: string;
}

/** Parcela — sem status salvo: o status é sempre calculado */
export interface Installment extends Audit {
  id: string;
  contractId: string;
  label: string;
  sequence: number;
  amount: Cents;
  dueDate: ISODate;
  adjustmentNote?: string;
}

export interface Payment extends Audit {
  id: string;
  contractId: string;
  installmentId: string | null;
  amount: Cents;
  paidAt: ISODate;
  method: PaymentMethod;
  /** Person.id */
  paidBy: string;
  notes?: string;
  receiptUrl?: string;
}

export interface Person {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  personId?: string;
}

/** Tarefa do casal (checklist do casamento) */
export interface Task extends Audit {
  id: string;
  title: string;
  /** Person.id; null = sem responsável */
  assigneeId: string | null;
  notes?: string;
  dueDate: ISODate | null;
  done: boolean;
  doneAt?: ISODate;
}

/** Tudo o que o app precisa, carregado de uma vez */
export interface Snapshot {
  wedding: Wedding;
  categories: Category[];
  suppliers: Supplier[];
  quotes: Quote[];
  contracts: Contract[];
  installments: Installment[];
  payments: Payment[];
  people: Person[];
  users: User[];
  tasks: Task[];
}

export type EntityName = Exclude<keyof Snapshot, 'wedding'> | 'wedding';
