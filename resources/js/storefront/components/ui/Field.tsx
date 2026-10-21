import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@shared/format';

interface FieldShellProps {
    label: ReactNode;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
    className?: string;
    children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
}

/** Label, control, hint and error wired together for assistive technology. */
export function Field({ label, error, hint, optional = false, className, children }: FieldShellProps) {
    const id = useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm text-ink">
                <span>{label}</span>
                {optional && <span className="text-2xs tracking-[0.12em] text-muted uppercase">Facultatif</span>}
            </label>
            {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
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

export function TextField({ label, error, hint, optional, fieldClassName, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Field label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
            {(a11y) => <input className={cn('field-control', className)} {...a11y} {...props} />}
        </Field>
    );
}

export function TextAreaField({ label, error, hint, optional, fieldClassName, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <Field label={label} error={error} hint={hint} optional={optional} className={fieldClassName}>
            {(a11y) => <textarea className={cn('field-control min-h-28 resize-y leading-relaxed', className)} {...a11y} {...props} />}
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
        <label className={cn('flex cursor-pointer items-start gap-3 text-sm text-muted', className)}>
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-(--color-accent)" {...props} />
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
            className={cn('border-l-2 px-4 py-3 text-sm', tone === 'error' ? 'border-danger bg-danger/8 text-ink' : 'border-success bg-success/8 text-ink')}
        >
            {message}
        </p>
    );
}
