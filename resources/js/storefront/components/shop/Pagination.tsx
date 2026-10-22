import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@shared/format';
import { t } from '../../i18n';

/** 1 … 4 5 [6] 7 8 … 12 */
export function pageWindow(current: number, last: number): Array<number | 'gap'> {
    const pages = new Set([1, last, current - 1, current, current + 1].filter((page) => page >= 1 && page <= last));
    const sorted = [...pages].sort((a, b) => a - b);
    const result: Array<number | 'gap'> = [];

    sorted.forEach((page, index) => {
        const previous = sorted[index - 1];
        if (previous !== undefined && page - previous > 1) {
            result.push('gap');
        }
        result.push(page);
    });

    return result;
}

export function Pagination({ current, last, onChange }: { current: number; last: number; onChange: (page: number) => void }) {
    if (last <= 1) {
        return null;
    }

    const arrow = 'inline-flex size-11 items-center justify-center text-muted transition-colors hover:text-ink disabled:opacity-30';

    return (
        <nav aria-label={t('Pagination')} className="flex items-center justify-center gap-1">
            <button type="button" className={arrow} onClick={() => onChange(current - 1)} disabled={current <= 1} aria-label={t('Page précédente')}>
                <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
            {pageWindow(current, last).map((page, index) =>
                page === 'gap' ? (
                    <span key={`gap-${index}`} className="px-2 text-faint" aria-hidden="true">
                        …
                    </span>
                ) : (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onChange(page)}
                        aria-current={page === current ? 'page' : undefined}
                        aria-label={t('Page {page}', { page })}
                        className={cn('inline-flex size-11 items-center justify-center text-sm tabular-nums transition-colors', page === current ? 'border-b border-accent text-ink' : 'text-muted hover:text-ink')}
                    >
                        {page}
                    </button>
                ),
            )}
            <button type="button" className={arrow} onClick={() => onChange(current + 1)} disabled={current >= last} aria-label={t('Page suivante')}>
                <ChevronRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
        </nav>
    );
}
