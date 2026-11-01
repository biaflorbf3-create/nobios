import { Copy, HandCoins, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { href } from '../../app/router';
import { installmentStatusText, type Finance } from '../../domain/finance';
import type { PaymentMethod, Snapshot } from '../../domain/types';
import { formatMonthLong, formatShort, monthKey } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { Button, Select } from '../../ui/form';
import { PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import { INSTALLMENT_TONE } from '../../ui/tones';
import { useRegisterPayment } from './PaymentContext';
import { buildRows, matchStatus, type PaymentRow, type StatusFilter } from './rows';

const STATUS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'paid', label: 'Pagos' },
  { id: 'open', label: 'A vencer' },
  { id: 'overdue', label: 'Vencidos' },
];

interface Filters {
  status: StatusFilter;
  supplier: string;
  category: string;
  month: string;
  payer: string;
  method: string;
}
const EMPTY: Filters = { status: 'all', supplier: '', category: '', month: '', payer: '', method: '' };

export function PaymentsList({ snapshot, finance }: { snapshot: Snapshot; finance: Finance }) {
  const register = useRegisterPayment();
  const toast = useToast();
  const [f, setF] = useState<Filters>(EMPTY);
  const all = useMemo(() => buildRows(snapshot, finance), [snapshot, finance]);
  const people = new Map(snapshot.people.map((p) => [p.id, p]));

  // filtros que não são o de status (para os contadores das abas)
  const base = all.filter(
    (r) =>
      (!f.supplier || r.supplierId === f.supplier) &&
      (!f.category || r.categoryId === f.category) &&
      (!f.month || monthKey(r.v.installment.dueDate) === f.month) &&
      (!f.payer || r.v.payments.some((p) => p.paidBy === f.payer)) &&
      (!f.method || r.v.payments.some((p) => p.method === f.method)),
  );
  const rows = base.filter((r) => matchStatus(r.v, f.status));
  const counts = Object.fromEntries(STATUS.map((s) => [s.id, base.filter((r) => matchStatus(r.v, s.id)).length])) as Record<StatusFilter, number>;

  const total = {
    amount: rows.reduce((s, r) => s + r.v.installment.amount, 0),
    paid: rows.reduce((s, r) => s + r.v.paid, 0),
    remaining: rows.reduce((s, r) => s + r.v.remaining, 0),
  };

  // quem pagou / forma — sobre os pagamentos das parcelas filtradas
  const payments = rows.flatMap((r) => r.v.payments).filter((p) => (!f.payer || p.paidBy === f.payer) && (!f.method || p.method === f.method));
  const byPayer = groupSum(payments, (p) => p.paidBy);
  const byMethod = groupSum(payments, (p) => p.method);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  const suppliers = uniq(all.map((r) => [r.supplierId, r.supplierName])).sort((a, b) => a[1].localeCompare(b[1]));
  const categories = uniq(all.map((r) => [r.categoryId, r.categoryName])).sort((a, b) => a[1].localeCompare(b[1]));
  const months = [...new Set(all.map((r) => monthKey(r.v.installment.dueDate)))].sort();
  const active = (Object.keys(EMPTY) as (keyof Filters)[]).filter((k) => k !== 'status' && f[k]).length;
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));

  async function copyCsv() {
    const head = ['Vencimento', 'Fornecedor', 'Parcela', 'Categoria', 'Valor', 'Pago', 'Restante', 'Status', 'Pago por', 'Forma', 'Data do pagamento'];
    const lines = rows.map((r) => {
      const p = r.v.payments;
      return [
        formatShort(r.v.installment.dueDate),
        r.supplierName,
        r.v.installment.label,
        r.categoryName,
        num(r.v.installment.amount),
        num(r.v.paid),
        num(r.v.remaining),
        installmentStatusText(r.v),
        p.map((x) => people.get(x.paidBy)?.name ?? '').join(' + '),
        p.map((x) => PAYMENT_METHOD_LABEL[x.method]).join(' + '),
        p.map((x) => formatShort(x.paidAt)).join(' + '),
      ];
    });
    const csv = [head, ...lines].map((l) => l.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      toast(`${rows.length} linhas copiadas · cole numa planilha`);
    } catch {
      toast('Não foi possível copiar neste navegador.');
    }
  }

  return (
    <div className="space-y-4">
      {/* filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Status" className="flex overflow-x-auto glass rounded-full p-1 shadow-card">
            {STATUS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={f.status === s.id}
                onClick={() => set({ status: s.id })}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                  f.status === s.id ? 'bg-accent text-white' : 'text-ink-muted hover:bg-cream hover:text-ink'
                }`}
              >
                {s.label}
                <span className={`num text-[11px] ${f.status === s.id ? 'text-white/75' : s.id === 'overdue' && counts.overdue ? 'text-danger' : 'text-ink-faint'}`}>{counts[s.id]}</span>
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={copyCsv} className="ml-auto" title="Copia a tabela filtrada para colar numa planilha">
            <Copy size={13} aria-hidden /> Copiar tabela
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <FilterSelect label="Fornecedor" value={f.supplier} onChange={(v) => set({ supplier: v })} options={suppliers} />
          <FilterSelect label="Categoria" value={f.category} onChange={(v) => set({ category: v })} options={categories} />
          <FilterSelect label="Mês" value={f.month} onChange={(v) => set({ month: v })} options={months.map((m) => [m, cap(formatMonthLong(m))])} />
          <FilterSelect label="Quem pagou" value={f.payer} onChange={(v) => set({ payer: v })} options={snapshot.people.map((p) => [p.id, p.name])} />
          <FilterSelect label="Forma" value={f.method} onChange={(v) => set({ method: v })} options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => [m, PAYMENT_METHOD_LABEL[m]])} />
        </div>
        {active > 0 && (
          <button onClick={() => setF({ ...EMPTY, status: f.status })} className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-ink">
            <X size={13} aria-hidden /> Limpar {active} {active === 1 ? 'filtro' : 'filtros'}
          </button>
        )}
      </div>

      {/* totais do filtro */}
      <div className="grid grid-cols-3 gap-3">
        <TotalTile label={`${rows.length} ${rows.length === 1 ? 'parcela' : 'parcelas'}`} cents={total.amount} />
        <TotalTile label="Pago" cents={total.paid} />
        <TotalTile label="Em aberto" cents={total.remaining} tone={rows.some((r) => r.v.status === 'overdue') ? 'danger' : undefined} />
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-12 text-center text-[14px] text-ink-muted">Nenhuma parcela com esses filtros.</div>
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-sand text-left">
                  <Th>Vencimento</Th>
                  <Th>Fornecedor</Th>
                  <Th>Parcela</Th>
                  <Th>Categoria</Th>
                  <Th right>Valor</Th>
                  <Th>Status</Th>
                  <Th>Pago por</Th>
                  <th className="w-[110px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Row key={r.v.installment.id} r={r} people={people} onRegister={() => register(r.v.installment.id)} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-sand bg-cream/40 text-[13px]">
                  <td className="px-4 py-3 font-medium" colSpan={4}>
                    Total do filtro
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Money cents={total.amount} size="sm" className="font-semibold" />
                  </td>
                  <td className="px-4 py-3 text-ink-muted" colSpan={3}>
                    pago <Money cents={total.paid} size="sm" className="text-ink" /> · em aberto <Money cents={total.remaining} size="sm" className="text-ink" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.v.installment.id} className="card flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <a href={href.supplier(r.supplierId)} className="block truncate text-[14.5px] font-medium">
                    {r.supplierName}
                  </a>
                  <div className="truncate text-[12.5px] text-ink-muted">
                    {r.v.installment.label} · {r.categoryName}
                  </div>
                  <div className="num mt-1 text-[12.5px] text-ink-soft">vence {formatShort(r.v.installment.dueDate)}</div>
                  {r.v.payments.length > 0 && <PaidBy r={r} people={people} />}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Money cents={r.v.status === 'paid' ? r.v.installment.amount : r.v.remaining} size="sm" className="font-medium" />
                  <StatusBadge tone={INSTALLMENT_TONE[r.v.status]}>{installmentStatusText(r.v)}</StatusBadge>
                  {r.v.remaining > 0 && (
                    <Button size="sm" onClick={() => register(r.v.installment.id)}>
                      <HandCoins size={13} aria-hidden /> Registrar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* quem pagou / forma */}
      {paidTotal > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Breakdown
            title="Quem pagou"
            total={paidTotal}
            items={byPayer.map(([id, v]) => ({ key: id, label: people.get(id)?.name ?? '—', value: v, color: people.get(id)?.color ?? '#9A9287' }))}
          />
          <Breakdown
            title="Forma de pagamento"
            total={paidTotal}
            items={byMethod.map(([m, v]) => ({ key: m, label: PAYMENT_METHOD_LABEL[m as PaymentMethod], value: v, color: '#4A453E' }))}
          />
        </div>
      )}
    </div>
  );
}

function Row({ r, people, onRegister }: { r: PaymentRow; people: Map<string, { name: string }>; onRegister: () => void }) {
  const v = r.v;
  return (
    <tr className="border-b border-sand/70 last:border-0 hover:bg-cream/40">
      <td className={`num px-4 py-3 ${v.status === 'overdue' ? 'font-medium text-danger' : 'text-ink-soft'}`}>{formatShort(v.installment.dueDate)}</td>
      <td className="px-4 py-3">
        <a href={href.supplier(r.supplierId)} className="font-medium hover:underline underline-offset-4">
          {r.supplierName}
        </a>
      </td>
      <td className="px-4 py-3 text-ink-soft">{v.installment.label}</td>
      <td className="px-4 py-3 text-ink-soft">{r.categoryName}</td>
      <td className="px-4 py-3 text-right">
        <Money cents={v.installment.amount} size="sm" className={v.status === 'paid' ? 'text-ink-muted' : 'font-medium'} />
        {v.isPartial && <div className="text-[11.5px] text-warn">restam {formatMoney(v.remaining)}</div>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={INSTALLMENT_TONE[v.status]}>{installmentStatusText(v)}</StatusBadge>
      </td>
      <td className="px-4 py-3">{v.payments.length > 0 ? <PaidBy r={r} people={people} /> : <span className="text-ink-faint">—</span>}</td>
      <td className="px-4 py-3 text-right">
        {v.remaining > 0 && (
          <Button size="sm" onClick={onRegister}>
            Registrar
          </Button>
        )}
      </td>
    </tr>
  );
}

function PaidBy({ r, people }: { r: PaymentRow; people: Map<string, { name: string }> }) {
  return (
    <div className="text-[12.5px] leading-[18px] text-ink-muted">
      {r.v.payments.map((p) => (
        <div key={p.id}>
          <span className="text-ink-soft">{people.get(p.paidBy)?.name}</span> · {PAYMENT_METHOD_LABEL[p.method]} · {formatShort(p.paidAt).slice(0, 5)}
          {r.v.payments.length > 1 && <span className="num"> · {formatMoney(p.amount)}</span>}
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, total, items }: { title: string; total: number; items: { key: string; label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <section className="card px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="label">{title}</h2>
        <span className="text-[12px] text-ink-muted">
          sobre <Money cents={total} size="sm" className="text-ink" /> pagos
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]">
            <span className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: i.color }} aria-hidden />
              {i.label}
            </span>
            <div className="h-1.5 rounded-full bg-cream">
              <div className="h-1.5 rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} />
            </div>
            <span className="flex items-baseline gap-2">
              <Money cents={i.value} size="sm" className="font-medium" />
              <span className="num w-8 text-right text-[11.5px] text-ink-muted">{Math.round((i.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TotalTile({ label, cents, tone }: { label: string; cents: number; tone?: 'danger' }) {
  return (
    <div className="card px-5 py-4">
      <div className="label">{label}</div>
      <Money cents={cents} size="lg" tone={tone ?? 'default'} className="mt-1 block" />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`!py-1.5 text-[13px] ${value ? '!border-ink-soft font-medium' : 'text-ink-muted'}`}>
      <option value="">{label}: todos</option>
      {options.map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </Select>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`label px-4 py-2.5 font-medium ${right ? 'text-right' : ''}`}>{children}</th>;
}

function groupSum<T>(items: T[], key: (t: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + (it as { amount: number }).amount);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function uniq(pairs: string[][]): [string, string][] {
  return [...new Map(pairs.map(([a, b]) => [a, b])).entries()];
}

const num = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
