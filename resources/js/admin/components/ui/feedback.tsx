import type { ReactNode } from 'react';
import { CircleAlert, FileQuestion, Info, LoaderCircle, RotateCcw, ShieldX, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@shared/format';
import type { ApiError } from '@shared/http';
import { Button, ButtonLink } from './Button';

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

/** Placeholder rows for a table that is loading for the first time. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div role="status" aria-label="Chargement…" className="divide-y divide-line">
            {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex items-center gap-4 px-4 py-3.5">
                    {Array.from({ length: columns }, (_, column) => (
                        <Skeleton key={column} className={cn('h-3.5', column === 0 ? 'w-1/4' : 'hidden flex-1 sm:block', column === columns - 1 && 'max-w-16')} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function Spinner({ className, label = 'Chargement…' }: { className?: string; label?: string }) {
    return (
        <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">{label}</span>
        </span>
    );
}

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
    /** `h1` when the empty state is the whole screen (not found, access denied). */
    as?: 'p' | 'h1' | 'h2';
}

export function EmptyState({ icon: Icon = FileQuestion, title, description, action, className, as: Title = 'p' }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
            <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-sunken text-muted">
                <Icon className="size-5" aria-hidden />
            </div>
            <Title className="text-sm font-medium text-ink">{title}</Title>
            {description && <p className="mt-1 max-w-sm text-sm text-pretty text-muted">{description}</p>}
            {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
        </div>
    );
}

/** Failure of a screen's main request, with the right wording for 403 / 404. */
export function ErrorState({ error, onRetry, className }: { error: ApiError; onRetry?: () => void; className?: string }) {
    if (error.status === 403) {
        return (
            <EmptyState
                className={className}
                icon={ShieldX}
                title="Accès refusé"
                description="Votre rôle ne permet pas d’ouvrir cette section. Demandez l’accès à un administrateur si vous en avez besoin."
                action={
                    <ButtonLink to="/" variant="secondary" size="sm">
                        Retour au tableau de bord
                    </ButtonLink>
                }
            />
        );
    }

    if (error.status === 404) {
        return (
            <EmptyState
                className={className}
                icon={FileQuestion}
                title="Introuvable"
                description="Cet élément n’existe pas ou a été supprimé."
                action={
                    <ButtonLink to="/" variant="secondary" size="sm">
                        Retour au tableau de bord
                    </ButtonLink>
                }
            />
        );
    }

    return (
        <EmptyState
            className={className}
            icon={TriangleAlert}
            title="Chargement impossible"
            description={error.message}
            action={
                onRetry && (
                    <Button size="sm" icon={RotateCcw} onClick={onRetry}>
                        Réessayer
                    </Button>
                )
            }
        />
    );
}

const ALERT_TONES = {
    info: { icon: Info, className: 'border-accent/30 bg-accent/[0.06] text-ink', iconClass: 'text-accent' },
    warning: { icon: TriangleAlert, className: 'border-warning/35 bg-warning/[0.08] text-ink', iconClass: 'text-warning' },
    danger: { icon: CircleAlert, className: 'border-danger/35 bg-danger/[0.08] text-ink', iconClass: 'text-danger' },
} as const;

/** Inline message inside a form or panel. Use `role="alert"` for errors raised by an action. */
export function InlineAlert({
    tone = 'info',
    title,
    children,
    className,
    live = false,
}: {
    tone?: keyof typeof ALERT_TONES;
    title?: ReactNode;
    children?: ReactNode;
    className?: string;
    live?: boolean;
}) {
    const { icon: Icon, className: toneClass, iconClass } = ALERT_TONES[tone];

    return (
        <div role={live ? 'alert' : undefined} className={cn('flex gap-3 rounded-lg border px-3.5 py-3 text-sm', toneClass, className)}>
            <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden />
            <div className="min-w-0">
                {title && <p className="font-medium">{title}</p>}
                {children && <div className={cn('text-muted', title ? 'mt-0.5' : null)}>{children}</div>}
            </div>
        </div>
    );
}
