import type { ReactNode } from 'react';
import { cn } from '@shared/format';
import { RevealRule, RevealWords } from '../../motion/Reveal';

interface PageHeaderProps {
    label: string;
    title: string;
    /** Short fact at the end of the rule, e.g. "12 parfums". */
    meta?: ReactNode;
    /** Beside the title on large screens, e.g. a list of anchors. */
    aside?: ReactNode;
    /** Introduction under the title. */
    children?: ReactNode;
    className?: string;
}

/**
 * Opening of an inner page, in the homepage's editorial voice: "— Label ──── meta",
 * then a title whose words rise in, and an optional introduction.
 */
export function PageHeader({ label, title, meta, aside, children, className }: PageHeaderProps) {
    return (
        <header className={cn('flex flex-col gap-7 border-b border-line pb-10 sm:gap-9 sm:pb-12', className)}>
            <div className="flex items-center gap-4 text-2xs font-medium tracking-label text-muted uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                <span>{label}</span>
                <RevealRule />
                {meta && <span className="tabular-nums">{meta}</span>}
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="flex max-w-3xl flex-col gap-5">
                    <RevealWords as="h1" text={title} className="font-display text-display-lg font-normal text-balance" />
                    {children}
                </div>
                {aside}
            </div>
        </header>
    );
}
