import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@shared/format';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
    primary: 'bg-accent text-on-accent hover:bg-accent-strong',
    secondary: 'border border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-canvas',
    ghost: 'text-ink hover:bg-ink/6',
    quiet: 'text-muted hover:text-ink',
};

const sizes: Record<Size, string> = {
    sm: 'h-10 px-4 text-[0.6875rem]',
    md: 'h-12 px-6 text-xs',
    lg: 'h-14 px-8 text-[0.8125rem]',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
    return cn(
        'relative inline-flex items-center justify-center gap-2.5 font-medium uppercase tracking-[0.16em] whitespace-nowrap select-none',
        'transition-[background-color,color,border-color,opacity] duration-300 ease-luxe',
        'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
    );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    children: ReactNode;
}

export function Button({ variant, size, loading = false, className, children, disabled, type = 'button', ...props }: ButtonProps) {
    return (
        <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
            {loading && <Spinner className="size-4" />}
            {children}
        </button>
    );
}

interface ButtonLinkProps extends LinkProps {
    variant?: Variant;
    size?: Size;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
    return <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : undefined)} {...props} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    children: ReactNode;
}

/** Square icon button; `label` is announced to screen readers. */
export function IconButton({ label, className, children, type = 'button', ...props }: IconButtonProps) {
    return (
        <button
            type={type}
            aria-label={label}
            title={label}
            className={cn(
                'relative inline-flex size-11 items-center justify-center text-ink transition-colors duration-300 hover:text-accent disabled:opacity-40',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
