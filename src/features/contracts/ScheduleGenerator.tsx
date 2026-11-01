import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateSchedule, type ScheduleItem } from '../../domain/finance';
import type { Cents, ISODate } from '../../domain/types';
import { addMonths, formatShort } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { ChoiceGroup, DateInput, Field, MoneyInput, Select, TextInput } from '../../ui/form';

export type ScheduleMode = 'installments' | 'single' | 'later';

interface Props {
  /** valor a distribuir nas parcelas */
  total: Cents | null;
  /** data base (contratação) para sugerir vencimentos */
  baseDate: ISODate;
  rows: ScheduleItem[];
  onChange: (rows: ScheduleItem[]) => void;
  /** esconde a opção "cadastrar depois" (ex.: ao regerar cronograma) */
  allowLater?: boolean;
  /** número inicial para a sequência (quando já existem parcelas pagas) */
  startSequence?: number;
}

/**
 * Entrada + N parcelas → prévia editável.
 * Mudar qualquer parâmetro regera a prévia; editar uma linha mantém a edição até a próxima mudança de parâmetro.
 */
export function ScheduleGenerator({ total, baseDate, rows, onChange, allowLater = true, startSequence = 1 }: Props) {
  const [mode, setMode] = useState<ScheduleMode>('installments');
  const [hasDown, setHasDown] = useState(true);
  const [down, setDown] = useState<Cents | null>(null);
  const [downDate, setDownDate] = useState(baseDate);
  const [count, setCount] = useState(3);
  const [firstDue, setFirstDue] = useState(addMonths(baseDate, 1));
  const [every, setEvery] = useState(1);
  const [singleDate, setSingleDate] = useState(baseDate);
  const [error, setError] = useState<string | null>(null);

  // acompanha a data base enquanto a pessoa não mexeu nas datas
  useEffect(() => {
    setDownDate(baseDate);
    setSingleDate(baseDate);
    setFirstDue(addMonths(baseDate, 1));
  }, [baseDate]);

  useEffect(() => {
    if (!total || total <= 0 || mode === 'later') {
      setError(null);
      onChange([]);
      return;
    }
    try {
      const items =
        mode === 'single'
          ? [{ label: 'Pagamento único', sequence: 1, amount: total, dueDate: singleDate }]
          : generateSchedule({
              total,
              downPayment: hasDown && down ? { amount: down, dueDate: downDate } : null,
              count,
              firstDueDate: firstDue,
              everyMonths: every,
            });
      setError(null);
      onChange(items.map((it, i) => ({ ...it, sequence: startSequence + i })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cronograma inválido');
      onChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, mode, hasDown, down, downDate, count, firstDue, every, singleDate, startSequence]);

  const sum = rows.reduce((s, r) => s + r.amount, 0);
  const diff = (total ?? 0) - sum;
  const updateRow = (i: number, patch: Partial<ScheduleItem>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const modes = [
    { value: 'installments' as const, label: 'Entrada + parcelas' },
    { value: 'single' as const, label: 'Pagamento único' },
    ...(allowLater ? [{ value: 'later' as const, label: 'Cadastrar depois' }] : []),
  ];

  return (
    <div className="space-y-4">
      <ChoiceGroup label="Forma do cronograma" value={mode} options={modes} onChange={setMode} />

      {mode === 'installments' && (
        <div className="space-y-3 rounded-xl border border-sand bg-surface p-4">
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
            <input type="checkbox" checked={hasDown} onChange={(e) => setHasDown(e.target.checked)} className="h-4 w-4" />
            Tem entrada
          </label>
          {hasDown && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entrada">{(id) => <MoneyInput id={id} value={down} onChange={setDown} />}</Field>
              <Field label="Data da entrada">{(id) => <DateInput id={id} value={downDate} onChange={(e) => e.target.value && setDownDate(e.target.value)} />}</Field>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label={hasDown ? 'Restante em' : 'Parcelas'}>
              {(id) => (
                <Select id={id} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="1º vencimento">{(id) => <DateInput id={id} value={firstDue} onChange={(e) => e.target.value && setFirstDue(e.target.value)} />}</Field>
            <Field label="A cada">
              {(id) => (
                <Select id={id} value={every} onChange={(e) => setEvery(Number(e.target.value))}>
                  <option value={1}>1 mês</option>
                  <option value={2}>2 meses</option>
                  <option value={3}>3 meses</option>
                </Select>
              )}
            </Field>
          </div>
          {total && hasDown && down ? (
            <p className="text-[12.5px] text-ink-muted">
              Restante de {formatMoney(Math.max(0, total - down))} em {count}x de ~{formatMoney(Math.floor(Math.max(0, total - down) / count))}
            </p>
          ) : null}
        </div>
      )}

      {mode === 'single' && (
        <Field label="Vencimento" className="max-w-[220px]">
          {(id) => <DateInput id={id} value={singleDate} onChange={(e) => e.target.value && setSingleDate(e.target.value)} />}
        </Field>
      )}

      {mode === 'later' && (
        <p className="rounded-lg bg-cream px-3 py-2.5 text-[13px] text-ink-muted">
          O contrato entra no total contratado. Enquanto não houver parcelas, o valor aparece no fluxo como “sem data” e gera um lembrete.
        </p>
      )}

      {!total && mode !== 'later' && <p className="text-[13px] text-ink-muted">Informe o valor total para ver o cronograma.</p>}
      {error && (
        <p className="flex items-center gap-2 text-[13px] text-danger">
          <AlertTriangle size={14} aria-hidden /> {error}
        </p>
      )}

      {rows.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="label">Prévia · edite o que precisar</h3>
            <span className="text-[12px] text-ink-muted">{rows.length} {rows.length === 1 ? 'pagamento' : 'pagamentos'}</span>
          </div>
          <ul className="divide-y divide-sand/70 overflow-hidden rounded-xl border border-sand bg-surface">
            {rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[1fr_128px_120px_28px] items-center gap-2 px-3 py-2">
                <TextInput aria-label="Descrição" value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })} className="!border-transparent !px-1.5 !py-1 hover:!border-sand" />
                <DateInput aria-label="Vencimento" value={r.dueDate} onChange={(e) => e.target.value && updateRow(i, { dueDate: e.target.value })} className="!px-1.5 !py-1 text-[13px]" />
                <MoneyInput ariaLabel="Valor" value={r.amount} onChange={(v) => updateRow(i, { amount: v ?? 0 })} className="[&_input]:!py-1 [&_input]:text-[13px]" />
                <button
                  type="button"
                  aria-label={`Remover ${r.label}`}
                  onClick={() => onChange(rows.filter((_, k) => k !== i))}
                  className="rounded p-1 text-ink-faint hover:bg-cream hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-[13px] ${diff === 0 ? 'bg-ok/10 text-ok' : diff > 0 ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'}`}>
            <span className="flex items-center gap-1.5">
              {diff === 0 ? <CheckCircle2 size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}
              {diff === 0 ? 'Fecha com o valor do contrato' : diff > 0 ? `Faltam ${formatMoney(diff)} sem data` : `Passa ${formatMoney(-diff)} do valor do contrato`}
            </span>
            <span className="num font-medium">{formatMoney(sum)}</span>
          </div>
          {diff !== 0 && rows.length > 0 && (
            <button
              type="button"
              onClick={() => updateRow(rows.length - 1, { amount: rows[rows.length - 1].amount + diff })}
              disabled={rows[rows.length - 1].amount + diff < 0}
              className="mt-1.5 text-[12.5px] font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
            >
              Ajustar a última ({formatShort(rows[rows.length - 1].dueDate)}) para fechar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
