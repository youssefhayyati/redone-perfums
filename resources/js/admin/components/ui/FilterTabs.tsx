import { cn } from '@shared/format';
import { formatNumber } from '../../lib/format';

export interface FilterTab<V extends string> {
    value: V;
    label: string;
    count?: number;
}

/** Status filters above a list; each tab is a toggle button reflecting the URL. */
export function FilterTabs<V extends string>({ label, tabs, value, onChange }: { label: string; tabs: Array<FilterTab<V>>; value: V; onChange: (value: V) => void }) {
    return (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div role="group" aria-label={label} className="flex min-w-max gap-1 border-b border-line">
                {tabs.map((tab) => {
                    const active = tab.value === value;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(tab.value)}
                            className={cn(
                                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
                                active ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 text-2xs leading-4 tabular-nums',
                                        active ? 'bg-accent/15 text-accent' : 'bg-ink/[0.07] text-muted',
                                    )}
                                >
                                    {formatNumber(tab.count)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
