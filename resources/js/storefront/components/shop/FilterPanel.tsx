import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Facets } from '@shared/types';
import { cn } from '@shared/format';
import { toggle, type ShopFilters } from './filters';
import { t } from '../../i18n';

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
            <legend className="eyebrow float-start mb-4 w-full">{title}</legend>
            {children}
        </fieldset>
    );
}

function CheckRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
    return (
        <label className="group flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-3">
                <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
                <span
                    aria-hidden="true"
                    className="flex size-4 items-center justify-center rounded-[0.3rem] border border-line-strong transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                >
                    <span className={cn('size-1.5 rounded-full bg-on-accent transition-opacity', checked ? 'opacity-100' : 'opacity-0')} />
                </span>
                <span className={cn('transition-colors', checked ? 'text-ink' : 'text-muted group-hover:text-ink')}>{label}</span>
            </span>
            {count !== undefined && <span className="text-xs text-faint tabular-nums">{count}</span>}
        </label>
    );
}

interface FilterPanelProps {
    facets: Facets | undefined;
    filters: ShopFilters;
    onChange: (changes: Partial<ShopFilters>) => void;
}

export function FilterPanel({ facets, filters, onChange }: FilterPanelProps) {
    const [search, setSearch] = useState(filters.q);
    const [min, setMin] = useState(filters.minPrice?.toString() ?? '');
    const [max, setMax] = useState(filters.maxPrice?.toString() ?? '');

    // Follow external changes (chips removed, back button).
    useEffect(() => setSearch(filters.q), [filters.q]);
    useEffect(() => setMin(filters.minPrice?.toString() ?? ''), [filters.minPrice]);
    useEffect(() => setMax(filters.maxPrice?.toString() ?? ''), [filters.maxPrice]);

    function applySearch(event: FormEvent) {
        event.preventDefault();
        onChange({ q: search });
    }

    function applyPrice(event?: FormEvent) {
        event?.preventDefault();
        const toNumber = (value: string) => (value.trim() === '' ? null : Math.max(0, Math.floor(Number(value))) || null);
        onChange({ minPrice: toNumber(min), maxPrice: toNumber(max) });
    }

    return (
        <div className="flex flex-col gap-6">
            <form role="search" onSubmit={applySearch} className="flex flex-col gap-2">
                <label htmlFor="shop-search" className="eyebrow">
                    {t('Rechercher')}
                </label>
                <input
                    id="shop-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onBlur={() => search !== filters.q && onChange({ q: search })}
                    placeholder={t('Nom, note, famille…')}
                    className="field-control"
                />
            </form>

            {facets && facets.families.length > 0 && (
                <Group title={t('Famille olfactive')}>
                    {facets.families.map((family) => (
                        <CheckRow
                            key={family.slug}
                            label={family.name}
                            count={family.count}
                            checked={filters.families.includes(family.slug)}
                            onChange={() => onChange({ families: toggle(filters.families, family.slug) })}
                        />
                    ))}
                </Group>
            )}

            {facets && facets.collections.length > 0 && (
                <Group title={t('Collection')}>
                    {facets.collections.map((collection) => (
                        <CheckRow
                            key={collection.slug}
                            label={collection.name}
                            checked={filters.collections.includes(collection.slug)}
                            onChange={() => onChange({ collections: toggle(filters.collections, collection.slug) })}
                        />
                    ))}
                </Group>
            )}

            {facets && facets.sizes.length > 0 && (
                <Group title={t('Contenance')}>
                    <div className="flex flex-wrap gap-2">
                        {facets.sizes.map((size) => {
                            const active = filters.sizes.includes(size);

                            return (
                                <button
                                    key={size}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onChange({ sizes: toggle(filters.sizes, size) })}
                                    className={cn('h-9 rounded-full border px-4 text-xs tabular-nums transition-colors', active ? 'border-accent bg-accent text-on-accent' : 'border-line-strong text-muted hover:border-ink hover:text-ink')}
                                >
                                    {size} ml
                                </button>
                            );
                        })}
                    </div>
                </Group>
            )}

            {facets && facets.price.max > 0 && (
                <Group title={t('Prix (DH)')}>
                    <form onSubmit={applyPrice} className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col gap-1.5 text-xs text-muted">
                                {t('Minimum')}
                                <input type="number" inputMode="numeric" min={0} value={min} onChange={(event) => setMin(event.target.value)} onBlur={() => applyPrice()} placeholder={String(Math.floor(facets.price.min / 100))} className="field-control min-h-10 py-2" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs text-muted">
                                {t('Maximum')}
                                <input type="number" inputMode="numeric" min={0} value={max} onChange={(event) => setMax(event.target.value)} onBlur={() => applyPrice()} placeholder={String(Math.ceil(facets.price.max / 100))} className="field-control min-h-10 py-2" />
                            </label>
                        </div>
                        <p className="text-xs text-faint">{t('Le prix et la contenance s’appliquent au même flacon.')}</p>
                    </form>
                </Group>
            )}
        </div>
    );
}
