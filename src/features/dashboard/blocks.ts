import { BellRing, ChartArea, ChartBar, CircleGauge, LayoutGrid, ListOrdered, Scale, Wallet, type LucideIcon } from 'lucide-react';

export type BlockId = 'hero' | 'ring' | 'categories' | 'cashflow' | 'upcoming' | 'spend' | 'alerts' | 'budget';

export interface BlockDef {
  id: BlockId;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** largura relativa quando divide a linha com outro bloco; 0 = sempre a linha inteira */
  weight: number;
}

export const DASHBOARD_BLOCKS: BlockDef[] = [
  { id: 'hero', label: 'Disponível', hint: 'saldo e os 4 números principais', icon: Wallet, weight: 8 },
  { id: 'ring', label: 'Comprometido', hint: 'anel de % do orçamento', icon: CircleGauge, weight: 4 },
  { id: 'categories', label: 'Categorias', hint: 'grade de ícones', icon: LayoutGrid, weight: 0 },
  { id: 'cashflow', label: 'Fluxo de pagamentos', hint: 'pago × a pagar por mês', icon: ChartArea, weight: 7 },
  { id: 'upcoming', label: 'Próximos pagamentos', hint: 'parcelas que vencem', icon: ListOrdered, weight: 5 },
  { id: 'spend', label: 'Onde o dinheiro vai', hint: 'barras por categoria', icon: ChartBar, weight: 7 },
  { id: 'alerts', label: 'Alertas', hint: 'o que pede atenção', icon: BellRing, weight: 5 },
  { id: 'budget', label: 'Orçado × contratado', hint: 'comparação por categoria', icon: Scale, weight: 0 },
];

export const DEFAULT_ORDER = DASHBOARD_BLOCKS.map((b) => b.id);
const BY_ID = new Map(DASHBOARD_BLOCKS.map((b) => [b.id, b]));
export const blockDef = (id: BlockId) => BY_ID.get(id)!;

/** Ordem salva → ordem válida: ignora ids desconhecidos e acrescenta blocos novos no fim */
export function normalizeOrder(saved: readonly string[] | undefined): BlockId[] {
  const known = (saved ?? []).filter((id, i, a): id is BlockId => BY_ID.has(id as BlockId) && a.indexOf(id) === i);
  return [...known, ...DEFAULT_ORDER.filter((id) => !known.includes(id))];
}

export const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Monta as linhas da grade (12 colunas no computador): dois blocos "de meia linha" seguidos
 * dividem a linha na proporção dos pesos; um bloco sozinho ocupa a linha inteira.
 */
export function layoutRows(order: BlockId[]): { id: BlockId; span: number }[][] {
  const rows: { id: BlockId; span: number }[][] = [];
  for (let i = 0; i < order.length; i++) {
    const a = blockDef(order[i]);
    const b = order[i + 1] ? blockDef(order[i + 1]) : null;
    if (a.weight && b?.weight) {
      const spanA = Math.round((12 * a.weight) / (a.weight + b.weight));
      rows.push([
        { id: a.id, span: spanA },
        { id: b.id, span: 12 - spanA },
      ]);
      i++;
    } else rows.push([{ id: a.id, span: 12 }]);
  }
  return rows;
}
