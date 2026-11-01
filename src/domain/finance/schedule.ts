import type { Cents, ISODate } from '../types';
import { addMonths } from '../../lib/dates';

export interface ScheduleInput {
  total: Cents;
  downPayment?: { amount: Cents; dueDate: ISODate } | null;
  count: number;
  firstDueDate: ISODate;
  everyMonths?: number;
}

export interface ScheduleItem {
  label: string;
  sequence: number;
  amount: Cents;
  dueDate: ISODate;
}

/**
 * Gera o cronograma: entrada opcional + N parcelas iguais.
 * Os centavos que sobram da divisão vão para a última parcela, para o total fechar exatamente.
 */
export function generateSchedule(input: ScheduleInput): ScheduleItem[] {
  const { total, downPayment, count, firstDueDate, everyMonths = 1 } = input;
  if (count < 0 || total < 0) throw new Error('Valores inválidos');
  const items: ScheduleItem[] = [];
  let seq = 1;
  const down = downPayment?.amount ?? 0;
  if (down > total) throw new Error('Entrada maior que o total');
  if (downPayment && down > 0) {
    items.push({ label: 'Entrada', sequence: seq++, amount: down, dueDate: downPayment.dueDate });
  }
  const rest = total - down;
  if (count === 0) {
    if (rest > 0) throw new Error('Defina ao menos uma parcela para o restante');
    return items;
  }
  const base = Math.floor(rest / count);
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    items.push({
      label: count === 1 && !downPayment ? 'Pagamento único' : `Parcela ${i + 1}/${count}`,
      sequence: seq++,
      amount: isLast ? rest - base * (count - 1) : base,
      dueDate: addMonths(firstDueDate, i * everyMonths),
    });
  }
  return items;
}
