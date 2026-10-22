import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@shared/format';

/** Small uppercase tracked label used for section titles across the admin. */
export function SectionLabel({ as: Tag = 'h2', id, className, children }: { as?: 'h2' | 'h3' | 'p' | 'span'; id?: string; className?: string; children: ReactNode }) {
    return (
        <Tag id={id} className={cn('text-2xs font-medium uppercase tracking-label text-muted', className)}>
            {children}
        </Tag>
    );
}

interface PanelProps {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    footer?: ReactNode;
    padded?: boolean;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

/** A raised card with an optional labelled header; the header names the region. */
export function Panel({ title, description, actions, footer, padded = true, className, bodyClassName, children }: PanelProps) {
    const titleId = useId();

    return (
        <section aria-labelledby={title ? titleId : undefined} className={cn('min-w-0 rounded-xl border border-line bg-raised', className)}>
            {(title || actions) && (
                <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                        {title && <SectionLabel id={titleId}>{title}</SectionLabel>}
                        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={cn(padded && 'p-4 sm:p-5', bodyClassName)}>{children}</div>
            {footer && <footer className="border-t border-line px-4 py-3 sm:px-5">{footer}</footer>}
        </section>
    );
}

interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { to: string; label: string };
    meta?: ReactNode;
}

export function PageHeader({ title, description, actions, back, meta }: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {back && (
                    <Link to={back.to} className="mb-2 inline-flex items-center gap-1 rounded text-xs text-muted transition-colors hover:text-ink">
                        <ChevronLeft className="size-3.5" aria-hidden />
                        {back.label}
                    </Link>
                )}
                <h1 className="text-xl font-semibold tracking-tight text-balance text-ink sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
                {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}

/** Label / value pairs for detail screens. */
export function DetailList({ items, className }: { items: Array<{ label: string; value: ReactNode; hidden?: boolean }>; className?: string }) {
    return (
        <dl className={cn('grid gap-x-4 gap-y-3 text-sm', className)}>
            {items
                .filter((item) => !item.hidden)
                .map((item) => (
                    <div key={item.label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-3">
                        <dt className="text-muted">{item.label}</dt>
                        <dd className="min-w-0 break-words text-ink">{item.value}</dd>
                    </div>
                ))}
        </dl>
    );
}
