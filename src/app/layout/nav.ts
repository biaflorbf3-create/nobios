import { ListChecks, LayoutDashboard, PieChart, Settings2, Store, Wallet, type LucideIcon } from 'lucide-react';
import type { Section } from '../router';

export interface NavItem {
  route: Section;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { route: 'painel', label: 'Painel', icon: LayoutDashboard },
  { route: 'pagamentos', label: 'Pagamentos', icon: Wallet },
  { route: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { route: 'fornecedores', label: 'Fornecedores', icon: Store },
  { route: 'orcamento', label: 'Orçamento', icon: PieChart },
];

export const SETTINGS: NavItem = { route: 'ajustes', label: 'Ajustes', icon: Settings2 };
