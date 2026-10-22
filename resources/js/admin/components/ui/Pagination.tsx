import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@shared/format';
import { formatNumber } from '../../lib/format';
import { pageWindow, rangeOf } from '../../lib/pagination';
import type { ListMeta } from '../../types';
import { IconButton } from './Button';

export function Pagination({ meta, onPage, noun = 'résultats' }: { meta: ListMeta; onPage: (page: number) => void; noun?: string }) {
    if (meta.total === 0) {
        return null;
    }

    const { from, to } = rangeOf(meta);

    return (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
            <p className="tabular-nums">
                {formatNumber(from)}–{formatNumber(to)} sur {formatNumber(meta.total)} {noun}
            </p>
            {meta.last_page > 1 && (
                <div className="flex items-center gap-1">
                    <IconButton icon={ChevronLeft} label="Page précédente" size="sm" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} />
                    <ul className="hidden items-center gap-1 sm:flex">
                        {pageWindow(meta.current_page, meta.last_page).map((slot, index) =>
                            slot === 'gap' ? (
                                <li key={`gap-${index}`} className="px-1" aria-hidden>
                                    …
                                </li>
                            ) : (
                                <li key={slot}>
                                    <button
                                        type="button"
                                        onClick={() => onPage(slot)}
                                        aria-current={slot === meta.current_page ? 'page' : undefined}
                                        aria-label={`Page ${slot}`}
                                        className={cn(
                                            'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs tabular-nums transition-colors',
                                            slot === meta.current_page ? 'bg-ink/[0.08] font-semibold text-ink' : 'text-muted hover:bg-ink/[0.06] hover:text-ink',
                                        )}
                                    >
                                        {slot}
                                    </button>
                                </li>
                            ),
                        )}
                    </ul>
                    <span className="px-2 tabular-nums sm:hidden">
                        {meta.current_page} / {meta.last_page}
                    </span>
                    <IconButton
                        icon={ChevronRight}
                        label="Page suivante"
                        size="sm"
                        disabled={meta.current_page >= meta.last_page}
                        onClick={() => onPage(meta.current_page + 1)}
                    />
                </div>
            )}
        </nav>
    );
}
