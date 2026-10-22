import type { ReactNode } from 'react';
import { cn } from '@shared/format';
import { RevealRule, RevealWords } from '../../motion/Reveal';

interface ChapterHeaderProps {
    /** Two-digit position of the chapter on the page, e.g. "02". */
    index: string;
    label: string;
    title: string;
    id: string;
    /** Short fact set at the end of the rule, e.g. "5 parfums". */
    meta?: string | null;
    action?: ReactNode;
    className?: string;
}

/** Numbered editorial heading: "(01) Label ──── meta", then a title whose words rise in. */
export function ChapterHeader({ index, label, title, id, meta, action, className }: ChapterHeaderProps) {
    return (
        <header className={cn('flex flex-col gap-7 sm:gap-9', className)}>
            <div className="flex items-center gap-4 text-2xs font-medium tracking-label text-muted uppercase">
                <span className="text-accent tabular-nums">({index})</span>
                <span>{label}</span>
                <RevealRule />
                {meta && <span className="tabular-nums">{meta}</span>}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
                <RevealWords id={id} text={title} className="max-w-4xl font-display text-display-lg font-normal text-balance" />
                {action}
            </div>
        </header>
    );
}
