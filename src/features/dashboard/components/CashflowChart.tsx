import { AlertCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Cashflow } from '../../../domain/finance';
import { formatMonthKey, formatMonthLong } from '../../../lib/dates';
import { formatMoney, formatMoneyShort } from '../../../lib/money';
import { Money } from '../../../ui/Money';
import { useTheme } from '../../../ui/ThemeProvider';

interface Row {
  key: string;
  label: string;
  paid: number;
  due: number;
  total: number;
  isCurrent: boolean;
}

/** Quanto sai por mês: área em degradê (total do mês), com o pago e o a pagar no detalhe */
export function CashflowChart({ cashflow, periodLabel }: { cashflow: Cashflow; periodLabel: string }) {
  const { colors } = useTheme();
  const crossesYear = new Set(cashflow.months.map((m) => m.key.slice(0, 4))).size > 1;
  const rows: Row[] = cashflow.months.map((m, i) => ({
    key: m.key,
    label: formatMonthKey(m.key, crossesYear && (i === 0 || m.key.endsWith('-01'))),
    paid: m.paid,
    due: m.due,
    total: m.paid + m.due,
    isCurrent: m.isCurrent,
  }));
  const peak = cashflow.peakMonth;
  const single = rows.length === 1;

  return (
    <section className="card flex h-full flex-col p-6" aria-label="Fluxo de pagamentos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">Fluxo de pagamentos</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <Money cents={cashflow.dueInPeriod} size="xl" />
            <span className="text-[12.5px] text-ink-muted">a pagar · {periodLabel.toLowerCase()}</span>
          </div>
          {peak && peak.due > 0 && rows.length > 2 && (
            <div className="mt-0.5 text-[12px] text-ink-muted">
              maior mês: <b className="font-semibold text-ink">{formatMonthLong(peak.key).split(' de ')[0]}</b> ({formatMoney(peak.due)})
            </div>
          )}
        </div>
        {cashflow.overdue > 0 && (
          <a href="#pagamentos" className="flex items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1.5 text-[12px] font-semibold text-danger">
            <AlertCircle size={13} aria-hidden /> {formatMoney(cashflow.overdue)} vencidos
          </a>
        )}
      </div>

      {rows.every((r) => r.total === 0) ? (
        <Empty text="Nenhum pagamento previsto neste período." hint="Ao cadastrar contratos com parcelas, a curva mostra quanto sai em cada mês." />
      ) : (
      <div
        className="mt-4 h-[230px] min-h-[200px] flex-1 -mx-2"
        role="img"
        aria-label={`Pagamentos por mês. ${rows.map((r) => `${r.label}: ${formatMoney(r.total)}`).join('; ')}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={single ? [rows[0], { ...rows[0], key: 'end', label: '' }] : rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.45} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.sand} strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={26}
              tick={(p) => <MonthTick {...p} rows={rows} colors={colors} />}
            />
            <YAxis tickFormatter={(v: number) => formatMoneyShort(v)} tickLine={false} axisLine={false} width={50} tick={{ fill: colors.inkFaint, fontSize: 11 }} />
            <Tooltip cursor={{ stroke: colors.accent, strokeWidth: 1, strokeDasharray: '4 4' }} content={(p) => <Tip active={p.active} payload={p.payload as never} />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={colors.accent}
              strokeWidth={2.5}
              fill="url(#flowFill)"
              isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                rows[p.index ?? -1]?.isCurrent ? (
                  <circle key="cur" cx={p.cx} cy={p.cy} r={5} fill={colors.surface} stroke={colors.accent} strokeWidth={2.5} />
                ) : (
                  <g key={p.index} />
                )
              }
              activeDot={{ r: 5, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
      {cashflow.unscheduled > 0 && (
        <p className="mt-2 text-[12px] text-ink-muted">
          + {formatMoney(cashflow.unscheduled)} contratados ainda sem data (contrato sem parcelas cadastradas).
        </p>
      )}
    </section>
  );
}

function MonthTick(props: { x?: number | string; y?: number | string; payload?: { value: string; index: number }; rows: Row[]; colors: ReturnType<typeof useTheme>['colors'] }) {
  const { x = 0, y = 0, payload, rows, colors } = props;
  const row = payload ? rows[payload.index] : undefined;
  return (
    <text x={Number(x)} y={Number(y) + 14} textAnchor="middle" fontSize={11.5} fontWeight={row?.isCurrent ? 700 : 500} fill={row?.isCurrent ? colors.ink : colors.inkFaint}>
      {payload?.value}
    </text>
  );
}

function Tip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Row }> }) {
  const r = payload?.[0]?.payload;
  if (!active || !r || r.key === 'end') return null;
  return (
    <div className="min-w-[180px] rounded-2xl bg-surface px-4 py-3 text-[12.5px] shadow-hover ring-1 ring-sand">
      <div className="mb-1.5 font-bold text-ink">{cap(formatMonthLong(r.key))}</div>
      {r.paid > 0 && <TipRow label="Pago" value={r.paid} />}
      <TipRow label="A pagar" value={r.due} />
      {r.paid > 0 && r.due > 0 && (
        <div className="mt-1.5 flex justify-between border-t border-sand pt-1.5 font-semibold">
          <span>Total</span>
          <span className="num">{formatMoney(r.total)}</span>
        </div>
      )}
    </div>
  );
}

function TipRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-ink-muted">{label}</span>
      <span className="num font-medium text-ink">{formatMoney(value)}</span>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Empty({ text, hint, href, cta }: { text: string; hint?: string; href?: string; cta?: string }) {
  return (
    <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-sand px-6 py-10 text-center">
      <p className="text-[13.5px] font-semibold text-ink-soft">{text}</p>
      {hint && <p className="mt-1 max-w-[340px] text-[12.5px] text-ink-muted">{hint}</p>}
      {href && cta && (
        <a href={href} className="mt-3 text-[12.5px] font-semibold text-accent hover:underline underline-offset-4">
          {cta} →
        </a>
      )}
    </div>
  );
}
