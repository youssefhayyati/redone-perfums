import type { ReactNode } from 'react';
import { cn } from '@shared/format';
import { Button } from './Button';

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center gap-5 px-6 py-20 text-center', className)}>
            <span aria-hidden="true" className="h-px w-12 bg-accent" />
            <h2 className="font-display text-display-sm">{title}</h2>
            {children && <div className="max-w-md text-muted">{children}</div>}
            {action}
        </div>
    );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <EmptyState title="Un contretemps" action={onRetry && <Button variant="secondary" onClick={onRetry}>Réessayer</Button>}>
            <p>{message}</p>
        </EmptyState>
    );
}

export function SectionHeading({ eyebrow, title, action, className, id }: { eyebrow?: string | null; title: ReactNode; action?: ReactNode; className?: string; id?: string }) {
    return (
        <div className={cn('flex flex-wrap items-end justify-between gap-6', className)}>
            <div className="flex max-w-2xl flex-col gap-4">
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                <h2 id={id} className="font-display text-display-md text-balance">
                    {title}
                </h2>
            </div>
            {action}
        </div>
    );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cn('inline-flex items-center bg-canvas/80 px-2.5 py-1 text-2xs font-medium tracking-[0.18em] text-ink uppercase backdrop-blur-sm', className)}>{children}</span>;
}
