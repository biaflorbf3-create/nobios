import {
  BedDouble,
  Cake,
  Camera,
  Candy,
  Car,
  Castle,
  Church,
  ClipboardList,
  Clapperboard,
  Ellipsis,
  Flower2,
  Gem,
  Gift,
  Landmark,
  Mail,
  Music,
  Palette,
  PenTool,
  Plane,
  Shirt,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../domain/types';

/** Ícone por categoria: pelo id dos dados de exemplo ou por palavras do nome (categorias criadas depois) */
const BY_KEY: [RegExp, LucideIcon][] = [
  [/espa[cç]o|local|sal[aã]o/i, Castle],
  [/buffet|comida|jantar/i, UtensilsCrossed],
  [/bebida|bar|drink/i, Wine],
  [/decora|flor/i, Flower2],
  [/foto/i, Camera],
  [/film|v[ií]deo/i, Clapperboard],
  [/dj|banda|m[uú]sica|som/i, Music],
  [/cerimonial|assessoria/i, ClipboardList],
  [/vestido|noiva/i, Sparkles],
  [/terno|traje|roupa/i, Shirt],
  [/alian[cç]a|joia/i, Gem],
  [/convite/i, Mail],
  [/papelaria|placa|menu/i, PenTool],
  [/bolo/i, Cake],
  [/doce/i, Candy],
  [/lembran|presente|mimo/i, Gift],
  [/beleza|maqui|cabelo/i, Palette],
  [/transporte|carro/i, Car],
  [/igreja|capela/i, Church],
  [/cart[oó]rio|civil/i, Landmark],
  [/lua de mel|viagem/i, Plane],
  [/hospeda|hotel/i, BedDouble],
  [/outro/i, Ellipsis],
];

export function categoryIcon(c: Pick<Category, 'id' | 'name'>): LucideIcon {
  const key = `${c.id.replace(/^cat_/, '')} ${c.name}`;
  return BY_KEY.find(([re]) => re.test(key))?.[1] ?? Tag;
}
