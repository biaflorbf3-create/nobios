import { useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { contractRepository } from '../../data/repositories';
import type { ContractView, ScheduleItem } from '../../domain/finance';
import type { Installment } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { Button } from '../../ui/form';
import { Sheet } from '../../ui/Sheet';
import { ScheduleGenerator } from './ScheduleGenerator';

/**
 * Gera (ou refaz) o cronograma de um contrato existente.
 * Parcelas com pagamento são mantidas; as em aberto são substituídas pelo novo cronograma.
 */
export function ScheduleSheet({ open, onClose, view, supplierName }: { open: boolean; onClose: () => void; view: ContractView; supplierName: string }) {
  const { run, pending } = useMutate();
  const [rows, setRows] = useState<ScheduleItem[]>([]);
  const kept = view.installments.filter((v) => v.payments.length > 0);
  const keptTotal = kept.reduce((s, v) => s + v.installment.amount, 0);
  const toSchedule = Math.max(0, view.contract.totalValue - keptTotal);
  const replaced = view.installments.length - kept.length;
  const startSeq = (kept[kept.length - 1]?.installment.sequence ?? 0) + 1;
  const sum = rows.reduce((s, r) => s + r.amount, 0);

  async function save() {
    const now = new Date().toISOString();
    const installments: Installment[] = rows.map((r, i) => ({
      id: `${newId('installments')}${i}`,
      contractId: view.contract.id,
      label: r.label,
      sequence: r.sequence,
      amount: r.amount,
      dueDate: r.dueDate,
      createdAt: now,
      updatedAt: now,
    }));
    const ok = await run(() => contractRepository.replaceSchedule(view.contract.id, installments), 'Cronograma salvo');
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={600}
      title={view.installments.length ? 'Refazer cronograma' : 'Gerar cronograma'}
      subtitle={`${supplierName} · ${view.contract.title}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={pending || rows.length === 0 || sum > toSchedule}>
            Salvar cronograma
          </Button>
        </>
      }
    >
      <div className="mb-5 space-y-1 rounded-lg bg-cream px-3.5 py-3 text-[13px] text-ink-soft">
        <div>
          Valor a distribuir: <b className="num font-medium text-ink">{formatMoney(toSchedule)}</b>
          {keptTotal > 0 && <> (contrato {formatMoney(view.contract.totalValue)} − {formatMoney(keptTotal)} em parcelas já pagas)</>}
        </div>
        {replaced > 0 && <div className="text-warn">As {replaced} parcelas em aberto serão substituídas.</div>}
      </div>
      <ScheduleGenerator total={toSchedule} baseDate={todayISO()} rows={rows} onChange={setRows} allowLater={false} startSequence={startSeq} />
    </Sheet>
  );
}
