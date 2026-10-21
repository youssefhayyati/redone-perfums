import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, X } from 'lucide-react';
import { buildQuery } from '@shared/http';
import { plural } from '@shared/format';
import { api } from '../api';
import { ProductGrid, ProductGridSkeleton } from '../components/product/ProductGrid';
import { FilterPanel } from '../components/shop/FilterPanel';
import { activeFilterCount, readFilters, SORT_LABELS, toApiQuery, writeFilters, type ShopFilters } from '../components/shop/filters';
import { Pagination } from '../components/shop/Pagination';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';

const PER_PAGE = 12;

export default function ShopPage() {
    const [params, setParams] = useSearchParams();
    const filters = readFilters(params);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const results = useRef<HTMLDivElement>(null);

    const apiQuery = toApiQuery(filters, PER_PAGE);
    const products = useQuery(`products:${buildQuery(apiQuery)}`, (signal) => api.products(apiQuery, { signal }), { keepPrevious: true });
    const facets = useQuery('facets', (signal) => api.facets({ signal }), { staleTime: 300_000 });

    const title = filters.q.trim() ? `« ${filters.q.trim()} »` : 'Tous les parfums';
    useHead({ title: filters.q.trim() ? `Recherche : ${filters.q.trim()}` : 'La boutique' });

    function update(changes: Partial<ShopFilters>) {
        const next: ShopFilters = { ...filters, page: 1, ...changes };
        setParams(writeFilters(next), { preventScrollReset: true });

        if (changes.page !== undefined) {
            results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    const reset = () => update({ q: '', families: [], collections: [], sizes: [], minPrice: null, maxPrice: null });

    const chips: Array<{ key: string; label: string; remove: () => void }> = [
        ...(filters.q.trim() ? [{ key: 'q', label: `« ${filters.q.trim()} »`, remove: () => update({ q: '' }) }] : []),
        ...filters.families.map((slug) => ({
            key: `f-${slug}`,
            label: facets.data?.families.find((family) => family.slug === slug)?.name ?? slug,
            remove: () => update({ families: filters.families.filter((item) => item !== slug) }),
        })),
        ...filters.collections.map((slug) => ({
            key: `c-${slug}`,
            label: facets.data?.collections.find((collection) => collection.slug === slug)?.name ?? slug,
            remove: () => update({ collections: filters.collections.filter((item) => item !== slug) }),
        })),
        ...filters.sizes.map((size) => ({ key: `s-${size}`, label: `${size} ml`, remove: () => update({ sizes: filters.sizes.filter((item) => item !== size) }) })),
        ...(filters.minPrice !== null ? [{ key: 'min', label: `Dès ${filters.minPrice} DH`, remove: () => update({ minPrice: null }) }] : []),
        ...(filters.maxPrice !== null ? [{ key: 'max', label: `Jusqu’à ${filters.maxPrice} DH`, remove: () => update({ maxPrice: null }) }] : []),
    ];

    const total = products.data?.meta.total;
    const activeCount = activeFilterCount(filters);

    return (
        <div className="container-page pt-12 sm:pt-16">
            <header className="flex flex-col gap-4 border-b border-line pb-10">
                <p className="eyebrow">La boutique</p>
                <h1 className="font-display text-display-lg text-balance">{title}</h1>
                <p className="text-sm text-muted" aria-live="polite">
                    {total !== undefined ? plural(total, 'parfum') : ' '}
                </p>
            </header>

            <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
                <aside className="hidden lg:block" aria-label="Filtres">
                    <div className="sticky top-28">
                        <FilterPanel facets={facets.data} filters={filters} onChange={update} />
                    </div>
                </aside>

                <div ref={results} className="flex scroll-mt-28 flex-col gap-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                                <SlidersHorizontal className="size-3.5" strokeWidth={1.5} />
                                Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
                            </Button>
                            {chips.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={chip.remove}
                                    className="inline-flex h-10 items-center gap-2 border border-line px-3 text-xs text-ink transition-colors hover:border-ink"
                                    aria-label={`Retirer le filtre ${chip.label}`}
                                >
                                    {chip.label}
                                    <X className="size-3 text-muted" strokeWidth={1.5} />
                                </button>
                            ))}
                            {chips.length > 1 && (
                                <button type="button" onClick={reset} className="link-draw ml-1 text-xs text-muted hover:text-ink">
                                    Tout effacer
                                </button>
                            )}
                        </div>

                        <label className="flex items-center gap-3 text-xs text-muted">
                            <span className="eyebrow">Trier</span>
                            <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })} className="field-control min-h-10 w-auto py-2 text-sm">
                                {Object.entries(SORT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {products.error && !products.data ? (
                        <ErrorState message={products.error.message} onRetry={products.refetch} />
                    ) : products.loading ? (
                        <ProductGridSkeleton count={6} cols={3} />
                    ) : products.data && products.data.data.length === 0 ? (
                        <EmptyState
                            title="Aucun parfum ne correspond"
                            action={
                                activeCount > 0 && (
                                    <Button variant="secondary" onClick={reset}>
                                        Effacer les filtres
                                    </Button>
                                )
                            }
                        >
                            <p>Élargissez votre recherche ou explorez une autre famille olfactive.</p>
                        </EmptyState>
                    ) : (
                        products.data && (
                            <div className={products.fetching ? 'opacity-60 transition-opacity duration-300' : 'transition-opacity duration-300'} aria-busy={products.fetching}>
                                <ProductGrid key={`${filters.page}-${filters.sort}`} products={products.data.data} cols={3} />
                            </div>
                        )
                    )}

                    {products.data && <Pagination current={products.data.meta.current_page} last={products.data.meta.last_page} onChange={(page) => update({ page })} />}
                </div>
            </div>

            <Drawer
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                side="left"
                title="Filtres"
                footer={
                    <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                        {total !== undefined ? `Voir ${plural(total, 'parfum')}` : 'Voir les parfums'}
                    </Button>
                }
            >
                <div className="px-6 py-6">
                    <FilterPanel facets={facets.data} filters={filters} onChange={update} />
                </div>
            </Drawer>
        </div>
    );
}
