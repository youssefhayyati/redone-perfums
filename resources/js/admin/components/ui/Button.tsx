import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@shared/format';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-on-accent hover:bg-accent-strong',
    secondary: 'border border-line-strong bg-raised text-ink hover:bg-ink/[0.06]',
    ghost: 'text-muted hover:bg-ink/[0.06] hover:text-ink',
    danger: 'bg-danger text-canvas hover:bg-danger/90',
    'danger-outline': 'border border-danger/45 text-danger hover:bg-danger/10',
};

export function buttonClasses({
    variant = 'secondary',
    size = 'md',
    block = false,
    className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}): string {
    return cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
        VARIANTS[variant],
        block && 'w-full',
        className,
    );
}

interface ButtonProps extends ComponentProps<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    loading?: boolean;
    block?: boolean;
}

export function Button({
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    block = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    const iconClass = size === 'sm' ? 'size-3.5' : 'size-4';

    return (
        <button
            {...props}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={buttonClasses({ variant, size, block, className })}
        >
            {loading ? <LoaderCircle className={cn(iconClass, 'animate-spin')} aria-hidden /> : Icon && <Icon className={iconClass} aria-hidden />}
            {children}
            {IconRight && !loading && <IconRight className={iconClass} aria-hidden />}
        </button>
    );
}

interface ButtonLinkProps extends LinkProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: LucideIcon;
    block?: boolean;
    children: ReactNode;
}

export function ButtonLink({ variant = 'secondary', size = 'md', icon: Icon, block = false, className, children, ...props }: ButtonLinkProps) {
    return (
        <Link {...props} className={buttonClasses({ variant, size, block, className: typeof className === 'string' ? className : undefined })}>
            {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />}
            {children}
        </Link>
    );
}

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
    icon: LucideIcon;
    /** Accessible name, also shown as a native tooltip. */
    label: string;
    size?: ButtonSize;
    variant?: 'ghost' | 'secondary' | 'danger';
    loading?: boolean;
}

export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', loading = false, className, type = 'button', disabled, ...props }: IconButtonProps) {
    return (
        <button
            {...props}
            type={type}
            aria-label={label}
            title={label}
            disabled={disabled || loading}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
                size === 'sm' ? 'size-8' : 'size-9',
                variant === 'ghost' && 'text-muted hover:bg-ink/[0.06] hover:text-ink',
                variant === 'secondary' && 'border border-line-strong bg-raised text-ink hover:bg-ink/[0.06]',
                variant === 'danger' && 'text-muted hover:bg-danger/10 hover:text-danger',
                className,
            )}
        >
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />}
        </button>
    );
}
