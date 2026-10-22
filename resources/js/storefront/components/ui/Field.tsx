import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@shared/format';
import { t } from '../../i18n';

interface FieldShellProps {
    label: ReactNode;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
    className?: string;
    children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
}

/**
 * Label, control, hint and error wired together for assistive technology. The control
 * must be a single `.field-control`: the label is drawn inside it (see `.field-float`).
 */
export function Field({ label, error, hint, optional = false, className, children }: FieldShellProps) {
    const id = useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="field-float">
                {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
                <label htmlFor={id} className="field-label">
                    {label}
                    {optional && <span className="sr-only">{t(' (facultatif)')}</span>}
                </label>
                {optional && (
                    <span aria-hidden="true" className="field-optional">
                        {t('Facultatif')}
                    </span>
                )}
            </div>
            {hint && !error && (
                <p id={hintId} className="text-xs text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="text-xs text-danger" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

type Common = { label: ReactNode; error?: string; hint?: ReactNode; optional?: boolean; fieldClassName?: string };

/** A placeholder is always set, even blank, so `:placeholder-shown` can tell when the field is empty. */
export function TextField({ label, error, hint, optional, fieldClassName, className, placeholder = ' ', ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Field label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
            {(a11y) => <input className={cn('field-control', className)} placeholder={placeholder} {...a11y} {...props} />}
        </Field>
    );
}

export function TextAreaField({ label, error, hint, optional, fieldClassName, className, placeholder = ' ', ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <Field label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
            {(a11y) => <textarea className={cn('field-control min-h-28 resize-y leading-relaxed', className)} placeholder={placeholder} {...a11y} {...props} />}
        </Field>
    );
}

export function SelectField({ label, error, hint, optional, fieldClassName, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <Field label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
            {(a11y) => (
                <select className={cn('field-control', className)} {...a11y} {...props}>
                    {children}
                </select>
            )}
        </Field>
    );
}

export function Checkbox({ label, className, ...props }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <label className={cn('flex cursor-pointer items-start gap-3 text-sm text-muted transition-colors hover:text-ink', className)}>
            <input type="checkbox" className="check-control mt-px" {...props} />
            <span>{label}</span>
        </label>
    );
}

/** Server message shown above a form when it does not belong to a single field. */
export function FormAlert({ message, tone = 'error' }: { message: string | null | undefined; tone?: 'error' | 'success' }) {
    if (!message) {
        return null;
    }

    return (
        <p
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn('border-s-2 px-4 py-3 text-sm', tone === 'error' ? 'border-danger bg-danger/8 text-ink' : 'border-success bg-success/8 text-ink')}
        >
            {message}
        </p>
    );
}
