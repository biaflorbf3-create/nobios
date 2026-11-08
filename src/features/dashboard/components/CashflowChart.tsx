import { AlertCircle } from 'lucide-react';
import { Area, Bar, BarChart, Cell, LabelList, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Cashflow } from '../../../domain/finance';
import { formatMonthKey, formatMonthLong } from '../../../lib/dates';
import { formatMoney, formatMoneyShort } from '../../../lib/money';
import { Money } from '../../../ui/Money';
import { useTheme } from '../../../ui/ThemeProvider';
import { useEffect, useState } from 'react';

function useNarrow() {
  const q = '(max-width: 639px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}

interface Row {
  key: string;
  label: string;
  paid: number;
  due: number;
  total: number;
  isCurrent: boolean;
  /** valores para as linhas: pago só até o mês atual, a pagar só a partir dele */
  paidLine: number | null;
  dueLine: number | null;
}

/**
 * Quanto sai por mês: linha cheia do que já foi pago (meses anteriores) e
 * linha tracejada do que falta pagar (daqui para frente). O destaque marca o mês atual.
 */
export function CashflowChart({ cashflow, chart, periodLabel }: { cashflow: Cashflow; chart: Cashflow; periodLabel: string }) {
  const { colors } = useTheme();
  // a pagar em âmbar: contraste claro com o roxo do pago, nos dois temas
  const dueColor = colors.warn;
  const crossesYear = new Set(chart.months.map((m) => m.key.slice(0, 4))).size > 1;
  const curIdx = chart.months.findIndex((m) => m.isCurrent);
  const rows: Row[] = chart.months.map((m, i) => ({
    paidLine: curIdx >= 0 && i > curIdx ? null : m.paid,
    dueLine: curIdx >= 0 && i < curIdx ? null : m.due,
    key: m.key,
    label: formatMonthKey(m.key, crossesYear && (i === 0 || m.key.endsWith('-01'))),
    paid: m.paid,
    due: m.due,
    total: m.paid + m.due,
    isCurrent: m.isCurrent,
  }));
  const current = rows.find((r) => r.isCurrent);
  const hasHistory = rows.length > 0 && !rows[0].isCurrent;
  const paidShown = rows.reduce((s, r) => s + r.paid, 0);
  const peak = cashflow.peakMonth;
  const single = rows.length === 1;
  // bolinha no mês atual: marca onde cada linha começa/termina (e aparece mesmo se for um ponto só)
  const todayDot = (color: string) => (p: { cx?: number; cy?: number; index?: number; value?: unknown }) =>
    p.index === curIdx && p.cy != null && !Number.isNaN(p.cy) ? (
      <circle key={`d${color}`} cx={p.cx} cy={p.cy} r={4.5} fill={colors.surface} stroke={color} strokeWidth={2.5} />
    ) : (
      <g key={`n${color}${p.index}`} />
    );
  const narrow = useNarrow();
  const step = narrow && rows.length > 7 ? Math.ceil(rows.length / 6) : 1;
  const data = rows;

  return (
    <section className="card flex h-full flex-col p-5 sm:p-6" aria-label="Fluxo de pagamentos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">Fluxo de pagamentos</h2>
          <div className="mt-1 flex items-baseline gap-2">
            <Money cents={cashflow.dueInPeriod} size="xl" />
            <span className="text-[12.5px] text-ink-muted">a pagar · {periodLabel.toLowerCase()}</span>
          </div>
          {peak && peak.due > 0 && cashflow.months.length > 2 && (
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
        <Empty text="Nenhum pagamento neste período." hint="Ao cadastrar contratos com parcelas e registrar pagamentos, as linhas mostram o que já foi pago e o que falta em cada mês." />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
            <Legend color={colors.accent} label="Pago" value={paidShown} hint={hasHistory ? 'nos meses do gráfico' : undefined} />
            <Legend color={dueColor} dashed label="A pagar" value={cashflow.dueInPeriod} />
          </div>
          <div
            className="mt-2 h-[230px] min-h-[200px] flex-1 -mx-2"
            role="img"
            aria-label={`Pagamentos por mês. ${rows.map((r) => `${r.label}: pago ${formatMoney(r.paid)}, a pagar ${formatMoney(r.due)}`).join('; ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              {single ? (
                <BarChart
                  data={[
                    { name: 'Pago', value: rows[0].paid },
                    { name: 'A pagar', value: rows[0].due },
                  ]}
                  margin={{ top: 24, right: 12, bottom: 0, left: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid vertical={false} stroke={colors.sand} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} height={26} tick={{ fill: colors.inkMuted, fontSize: 12, fontWeight: 600 }} />
                  <YAxis tickFormatter={(v: number) => formatMoneyShort(v)} tickLine={false} axisLine={false} width={50} tick={{ fill: colors.inkFaint, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]} maxBarSize={88} isAnimationActive={false}>
                    <Cell fill={colors.accent} />
                    <Cell fill={dueColor} />
                    <LabelList dataKey="value" position="top" formatter={(v: unknown) => formatMoney(Number(v))} style={{ fill: colors.ink, fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              ) : (
              <ComposedChart data={data} margin={{ top: 14, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dueColor} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={dueColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={colors.sand} strokeDasharray="0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={26} tick={(p) => <MonthTick {...p} rows={rows} colors={colors} step={step} />} />
                <YAxis tickFormatter={(v: number) => formatMoneyShort(v)} tickLine={false} axisLine={false} width={50} tick={{ fill: colors.inkFaint, fontSize: 11 }} />
                {current && !single && hasHistory && (
                  <ReferenceLine x={current.label} stroke={colors.inkFaint} strokeDasharray="2 4" label={{ value: 'hoje', position: 'top', fill: colors.inkMuted, fontSize: 10.5 }} />
                )}
                <Tooltip cursor={{ stroke: colors.accent, strokeWidth: 1, strokeDasharray: '4 4' }} content={(p) => <Tip active={p.active} payload={p.payload as never} />} />
                <Area type="monotone" dataKey="dueLine" name="A pagar" stroke={dueColor} strokeWidth={2.25} strokeDasharray="6 5" fill="url(#dueFill)" isAnimationActive={false} dot={todayDot(dueColor)} activeDot={{ r: 4.5, fill: dueColor, stroke: colors.surface, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="paidLine" name="Pago" stroke={colors.accent} strokeWidth={2.5} fill="url(#paidFill)" isAnimationActive={false} dot={todayDot(colors.accent)} activeDot={{ r: 5, fill: colors.accent, stroke: colors.surface, strokeWidth: 2 }} />
              </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
      {cashflow.unscheduled > 0 && (
        <p className="mt-2 text-[12px] text-ink-muted">
          + {formatMoney(cashflow.unscheduled)} contratados ainda sem data (contrato sem parcelas cadastradas).
        </p>
      )}
    </section>
  );
}

function Legend({ color, label, value, dashed, hint }: { color: string; label: string; value: number; dashed?: boolean; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="22" height="8" aria-hidden>
        <line x1="1" y1="4" x2="21" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? '5 4' : undefined} />
      </svg>
      <span className="text-ink-muted">{label}</span>
      <span className="num font-semibold text-ink">{formatMoney(value)}</span>
      {hint && <span className="text-ink-faint">{hint}</span>}
    </span>
  );
}

function MonthTick(props: { x?: number | string; y?: number | string; payload?: { value: string; index: number }; rows: Row[]; colors: ReturnType<typeof useTheme>['colors']; step: number }) {
  const { x = 0, y = 0, payload, rows, colors, step } = props;
  const row = payload ? rows[payload.index] : undefined;
  // no celular, com muitos meses, mostra um a cada `step` (sempre o mês atual), contando a partir do atual
  const cur = rows.findIndex((r) => r.isCurrent);
  if (payload && step > 1 && !row?.isCurrent && (payload.index - Math.max(cur, 0)) % step !== 0) return <g />;
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
      <TipRow label="Pago" value={r.paid} />
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
