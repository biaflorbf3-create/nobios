import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { CategoryView } from '../../../domain/finance';
import { formatMoney, formatMoneyShort, formatPct } from '../../../lib/money';
import { useTheme } from '../../../ui/ThemeProvider';
import { Empty } from './CashflowChart';



/** Onde o dinheiro está indo: barras verticais arredondadas, a maior em destaque (como a referência) */
export function CategorySpend({ categories, totalContracted }: { categories: CategoryView[]; totalContracted: number }) {
  const { colors } = useTheme();
  const TOP = typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 7;
  const sorted = categories.filter((c) => c.contracted > 0).sort((a, b) => b.contracted - a.contracted);
  const rows = sorted.slice(0, TOP).map((c) => ({ id: c.category.id, name: c.category.name, value: c.contracted }));
  const rest = sorted.slice(TOP);
  const restTotal = rest.reduce((s, c) => s + c.contracted, 0);
  const top = rows[0];

  return (
    <section className="card flex h-full flex-col p-6" aria-label="Onde o dinheiro está indo">
      <h2 className="text-[15px] font-bold tracking-[-0.01em]">Onde o dinheiro está indo</h2>
      {top && (
        <p className="mt-1 text-[12.5px] text-ink-muted">
          <b className="font-semibold text-ink">{top.name}</b> é a maior fatia: {formatPct(top.value / totalContracted)} do contratado
          {rest.length > 0 && <> · outras {rest.length} categorias somam {formatMoney(restTotal)}</>}
        </p>
      )}
      {rows.length === 0 ? (
        <Empty text="Ainda não há contratos." hint="Quando houver, aqui aparece quanto vai para cada categoria." href="#fornecedores" cta="Cadastrar fornecedor" />
      ) : (
      <div className="mt-4 h-[210px] min-h-[210px] flex-1" role="img" aria-label={rows.map((r) => `${r.name}: ${formatMoney(r.value)}`).join('; ')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 22, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={30} tick={{ fill: colors.inkMuted, fontSize: 11, fontWeight: 500 }} tickFormatter={(n: string) => (n.length > 9 ? `${n.slice(0, 8)}…` : n)} />
            <Tooltip
              cursor={{ fill: colors.cream, radius: 12 } as never}
              content={(p) => {
                const r = (p.payload?.[0] as { payload?: { name: string; value: number } } | undefined)?.payload;
                if (!p.active || !r) return null;
                return (
                  <div className="rounded-2xl bg-surface px-4 py-2.5 text-[12.5px] shadow-hover ring-1 ring-sand">
                    <div className="font-bold">{r.name}</div>
                    <div className="num text-ink-soft">
                      {formatMoney(r.value)} · {formatPct(r.value / totalContracted)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              radius={[12, 12, 12, 12]}
              maxBarSize={44}
              isAnimationActive={false}
              label={{ position: 'top', fill: colors.inkMuted, fontSize: 11, fontWeight: 600, formatter: (v: unknown) => formatMoneyShort(Number(v)) }}
            >
              {rows.map((r, i) => (
                <Cell key={r.id} fill={i === 0 ? colors.accent : colors.inkFaint} fillOpacity={i === 0 ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </section>
  );
}
