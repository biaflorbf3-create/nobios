import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { Cents } from '../domain/types';
import { formatMoneyInput, parseMoney } from '../lib/money';

const control =
  'w-full rounded-xl border border-sand bg-cream/60 px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint/50 focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60';

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">
        {label}
      </label>
      {children(id)}
      {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : hint ? <p className="mt-1 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${control} resize-y ${props.className ?? ''}`} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${control} appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 ${props.className ?? ''}`} style={{ backgroundImage: CHEVRON }}>
      {children}
    </select>
  );
}
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B655C' stroke-width='1.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** Campo de dinheiro: aceita "2500", "2.500" ou "2.500,00"; guarda centavos */
export function MoneyInput({
  value,
  onChange,
  id,
  className = '',
  autoFocus,
  placeholder = '0',
  ariaLabel,
}: {
  value: Cents | null;
  onChange: (v: Cents | null) => void;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value === null ? '' : formatMoneyInput(value));
  // sincroniza quando o valor muda por fora (pré-preenchimento), sem atrapalhar a digitação
  useEffect(() => {
    setText((t) => {
      const typed = t.trim() === '' ? null : parseMoney(t);
      return typed === value ? t : value === null ? '' : formatMoneyInput(value);
    });
  }, [value]);
  const invalid = text.trim() !== '' && parseMoney(text) === null;
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-muted">R$</span>
      <input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder={placeholder}
        value={text}
        onBlur={() => {
          const v = parseMoney(text);
          if (v !== null) setText(formatMoneyInput(v));
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.trim() === '' ? null : parseMoney(e.target.value));
        }}
        className={`${control} num pl-10 ${invalid ? 'border-danger' : ''}`}
      />
    </div>
  );
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" {...props} className={`${control} num ${props.className ?? ''}`} />;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'btn-grad text-white shadow-glow hover:brightness-105 border border-transparent',
  secondary: 'bg-surface text-ink border border-sand hover:border-ink-faint/60 hover:bg-cream/50',
  ghost: 'text-ink-soft hover:bg-cream hover:text-ink border border-transparent',
  danger: 'bg-surface text-danger border border-sand hover:border-danger/50 hover:bg-danger/5',
};

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
        size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2.5 text-[13.5px]'
      } ${VARIANT[variant]} ${className}`}
    />
  );
}

/** Grupo de escolha em pílulas (status, forma de pagamento, quem pagou) */
export function ChoiceGroup<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === o.value ? 'border-accent bg-accent text-white' : 'border-sand bg-surface text-ink-soft hover:border-accent/50 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
