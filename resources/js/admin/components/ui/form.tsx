import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@shared/format';

/** Props a Field hands to its control so label, hint and error are announced together. */
export interface ControlProps {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
    'aria-required'?: true;
}

interface FieldProps {
    label: ReactNode;
    error?: string;
    hint?: ReactNode;
    required?: boolean;
    optional?: boolean;
    labelHidden?: boolean;
    counter?: { value: number; max: number };
    className?: string;
    children: (control: ControlProps) => ReactNode;
}

export function Field({ label, error, hint, required, optional, labelHidden, counter, className, children }: FieldProps) {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <div className={cn('flex items-baseline justify-between gap-3', labelHidden && !counter && 'sr-only')}>
                <label htmlFor={id} className={cn('text-xs font-medium text-ink', labelHidden && 'sr-only')}>
                    {label}
                    {required && (
                        <span className="ml-0.5 text-danger" aria-hidden>
                            *
                        </span>
                    )}
                    {optional && <span className="ml-1 font-normal text-muted">(facultatif)</span>}
                </label>
                {counter && (
                    <span className={cn('text-2xs tabular-nums', counter.value > counter.max ? 'text-danger' : 'text-muted')} aria-hidden>
                        {counter.value} / {counter.max}
                    </span>
                )}
            </div>
            {children({
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': describedBy || undefined,
                'aria-required': required ? true : undefined,
            })}
            {hint && (
                <p id={hintId} className="text-xs text-muted">
                    {hint}
                </p>
            )}
            {error && <FieldError id={errorId}>{error}</FieldError>}
        </div>
    );
}

export function FieldError({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
    return (
        <p id={id} className={cn('flex gap-1.5 text-xs text-danger', className)}>
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{children}</span>
        </p>
    );
}

/** Spread on an input holding Arabic storefront copy so it is typed right to left. */
export const arabicText = { dir: 'rtl', lang: 'ar' } as const;

/** Description for the panel of a form that collects the Arabic version of the copy. */
export const ARABIC_PANEL_HINT = 'Textes de la boutique en arabe (/ar). Laissé vide, un champ reprend le texte français.';

/** Spread on an input holding English storefront copy, for the browser's spelling and hyphenation. */
export const englishText = { lang: 'en' } as const;

/** Description for the panel of a form that collects the English version of the copy. */
export const ENGLISH_PANEL_HINT = 'Textes de la boutique en anglais (/en). Laissé vide, un champ reprend le texte français.';

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
    return <input {...props} className={cn('field-control', className)} />;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
    return <textarea {...props} className={cn('field-control', className)} />;
}

export function SelectInput({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <select {...props} className={cn('field-control', className)}>
            {children}
        </select>
    );
}

/** Input with a unit shown inside the box ("DH", "ml", "%"). */
export function AffixInput({
    prefix,
    suffix,
    className,
    wrapperClassName,
    ...props
}: Omit<ComponentProps<'input'>, 'prefix'> & { prefix?: ReactNode; suffix?: ReactNode; /** Width of the whole control (e.g. `w-32`). */ wrapperClassName?: string }) {
    return (
        <div className={cn('relative', wrapperClassName)}>
            {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">{prefix}</span>}
            <input {...props} className={cn('field-control', prefix ? 'pl-8' : null, suffix ? 'pr-9' : null, className)} />
            {suffix && (
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-medium text-muted" aria-hidden>
                    {suffix}
                </span>
            )}
        </div>
    );
}

/** Amount typed in dirhams ("450" or "450,50"), kept as text until submit. */
export function MoneyInput(props: Omit<ComponentProps<'input'>, 'type' | 'inputMode' | 'prefix'> & { wrapperClassName?: string }) {
    return <AffixInput {...props} type="text" inputMode="decimal" autoComplete="off" suffix="DH" />;
}

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
    const id = useId();

    return (
        <div className={cn('flex items-start gap-3', className)}>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-describedby={description ? `${id}-description` : undefined}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
                    checked ? 'border-accent bg-accent' : 'border-line-strong bg-sunken',
                )}
            >
                <span
                    className={cn(
                        'size-3.5 rounded-full transition-transform duration-200',
                        checked ? 'translate-x-[1.1rem] bg-on-accent' : 'translate-x-[0.15rem] bg-muted',
                    )}
                    aria-hidden
                />
            </button>
            <div className="min-w-0">
                <label htmlFor={id} className="text-sm text-ink">
                    {label}
                </label>
                {description && (
                    <p id={`${id}-description`} className="mt-0.5 text-xs text-muted">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

export function Checkbox({ label, description, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; description?: ReactNode }) {
    const id = useId();

    return (
        <div className={cn('flex items-start gap-2.5', className)}>
            <input {...props} id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-accent" aria-describedby={description ? `${id}-d` : undefined} />
            <div className="min-w-0">
                <label htmlFor={id} className="text-sm text-ink">
                    {label}
                </label>
                {description && (
                    <p id={`${id}-d`} className="text-xs text-muted">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

/** Groups related controls under a legend styled like a field label. */
export function Fieldset({ legend, hint, error, className, children }: { legend: ReactNode; hint?: ReactNode; error?: string; className?: string; children: ReactNode }) {
    return (
        <fieldset className={cn('min-w-0', className)}>
            <legend className="mb-2 text-xs font-medium text-ink">{legend}</legend>
            {hint && <p className="-mt-1 mb-2 text-xs text-muted">{hint}</p>}
            {children}
            {error && <FieldError className="mt-2">{error}</FieldError>}
        </fieldset>
    );
}

export interface ChoiceOption<V extends string> {
    value: V;
    label: ReactNode;
    description?: ReactNode;
}

/** Radio choices drawn as cards; native radios keep arrow-key navigation. */
export function RadioCards<V extends string>({
    value,
    onChange,
    options,
    columns = 2,
    disabled,
}: {
    value: V;
    onChange: (value: V) => void;
    options: Array<ChoiceOption<V>>;
    columns?: 2 | 3;
    disabled?: boolean;
}) {
    const name = useId();

    return (
        <div className={cn('grid gap-2', columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <label
                        key={option.value}
                        className={cn(
                            'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                            selected ? 'border-accent bg-accent/[0.06]' : 'border-line-strong hover:bg-ink/[0.04]',
                            disabled && 'pointer-events-none opacity-60',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={selected}
                            disabled={disabled}
                            onChange={() => onChange(option.value)}
                            className="mt-0.5 size-4 shrink-0 accent-accent focus-visible:outline-none"
                        />
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink">{option.label}</span>
                            {option.description && <span className="mt-0.5 block text-xs text-muted">{option.description}</span>}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

/** Compact single choice (periods, modes). */
export function Segmented<V extends string>({
    label,
    value,
    onChange,
    options,
    size = 'md',
    className,
}: {
    label: string;
    value: V;
    onChange: (value: V) => void;
    options: Array<{ value: V; label: ReactNode }>;
    size?: 'sm' | 'md';
    className?: string;
}) {
    const name = useId();

    return (
        <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full rounded-lg border border-line bg-sunken/70 p-0.5', className)}>
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <label
                        key={option.value}
                        className={cn(
                            'relative cursor-pointer whitespace-nowrap rounded-md font-medium transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-accent',
                            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
                            selected ? 'bg-raised text-ink shadow-[0_1px_2px_rgb(var(--rp-shadow)/0.18)]' : 'text-muted hover:text-ink',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={selected}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                );
            })}
        </div>
    );
}

/** Scale 1–5 with an explicit "not shown" choice (longevity, sillage). */
export function ScaleInput({ label, value, onChange, error }: { label: string; value: number | null; onChange: (value: number | null) => void; error?: string }) {
    const options: Array<{ value: string; label: string }> = [{ value: '', label: '—' }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))];

    return (
        <Fieldset legend={label} error={error}>
            <Segmented
                label={label}
                value={value === null ? '' : String(value)}
                onChange={(next) => onChange(next === '' ? null : Number(next))}
                options={options}
                size="sm"
            />
        </Fieldset>
    );
}
