import { useState } from 'react';
import { Link } from 'react-router';
import { ArchiveRestore, Package, Plus, RotateCcw, SearchX, Star } from 'lucide-react';
import { cn, formatShortDate, plural } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Badge, ProductStatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/feedback';
import { FilterTabs } from '../../components/ui/FilterTabs';
import { SelectInput } from '../../components/ui/form';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { toast } from '../../components/ui/toast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { invalidateCatalogOptions, useCatalogOptions } from '../../hooks/useCatalogOptions';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useListParams } from '../../hooks/useListParams';
import { formatNumber } from '../../lib/format';
import { toApiQuery } from '../../lib/query';
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from '../../lib/status';
import type { AdminProduct } from '../../types';

const DEFAULTS = { trashed: '', search: '', status: '', family: '', collection: '', featured: false, sort: '', page: 1 };
const ALLOWED = { trashed: ['', 'only'], status: ['', ...PRODUCT_STATUSES], sort: ['', 'name', 'sales', 'updated'] };

const SORTS = [
    { value: '', label: 'Ordre de la boutique' },
    { value: 'name', label: 'Nom (A → Z)' },
    { value: 'sales', label: 'Meilleures ventes' },
    { value: 'updated', label: 'Dernières modifications' },
];

function priceRange(product: AdminProduct): string {
    const min = product.price_range?.min;
    const max = product.price_range?.max;
    if (min === null || min === undefined) {
        return '—';
    }

    return max !== null && max !== undefined && max !== min ? `${formatMoney(min)} – ${formatMoney(max)}` : formatMoney(min);
}

function Thumbnail({ product }: { product: AdminProduct }) {
    if (product.image?.url) {
        return (
            <img
                src={product.image.url}
                srcSet={product.image.srcset ?? undefined}
                sizes="40px"
                alt=""
                loading="lazy"
                className="size-10 shrink-0 rounded-md border border-line bg-sunken object-cover"
            />
        );
    }

    return (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-sunken" aria-hidden>
            <span className="size-3 rounded-full" style={{ backgroundColor: product.accent_color ?? 'var(--color-line-strong)' }} />
        </span>
    );
}

export default function ProductsPage() {
    useDocumentTitle('Produits');
    const [params, setParams, resetParams] = useListParams(DEFAULTS, ALLOWED);
    const { options } = useCatalogOptions();
    const archived = params.trashed === 'only';
    const query = useApiQuery(JSON.stringify(params), (signal) => api.products.list({ ...toApiQuery(params), per_page: 20 }, signal), { keepPrevious: true });
    const [restoring, setRestoring] = useState<number | null>(null);
    const filtered = params.search !== '' || params.status !== '' || params.family !== '' || params.collection !== '' || params.featured;

    async function restore(product: AdminProduct) {
        setRestoring(product.id);
        try {
            await api.products.restore(product.id);
            invalidateCatalogOptions();
            toast.success(`« ${product.name} » est de retour dans le catalogue.`);
            query.reload();
        } catch (error) {
            toast.error(error);
        } finally {
            setRestoring(null);
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Produits"
                description="Parfums, formats, prix et photos du catalogue."
                actions={
                    <ButtonLink to="/produits/nouveau" variant="primary" icon={Plus}>
                        Nouveau produit
                    </ButtonLink>
                }
            />

            <Panel padded={false}>
                <div className="flex flex-col gap-3 px-4 pt-3 sm:px-5">
                    <FilterTabs
                        label="Catalogue ou archives"
                        tabs={[
                            { value: '', label: 'Catalogue' },
                            { value: 'only', label: 'Archivés' },
                        ]}
                        value={params.trashed}
                        onChange={(trashed) => setParams({ trashed })}
                    />
                    <div className="flex flex-col gap-2 pb-4 pt-1 md:flex-row md:flex-wrap md:items-center">
                        <SearchInput className="md:w-72" label="Rechercher un produit" placeholder="Nom ou référence (SKU)" value={params.search} onChange={(search) => setParams({ search }, { replace: true })} />
                        <SelectInput aria-label="Statut" className="md:w-44" value={params.status} onChange={(event) => setParams({ status: event.target.value })}>
                            <option value="">Tous les statuts</option>
                            {PRODUCT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {PRODUCT_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput aria-label="Famille olfactive" className="md:w-48" value={params.family} onChange={(event) => setParams({ family: event.target.value })}>
                            <option value="">Toutes les familles</option>
                            {options?.families.map((family) => (
                                <option key={family.id} value={family.id}>
                                    {family.name}
                                </option>
                            ))}
                        </SelectInput>
                        <SelectInput aria-label="Collection" className="md:w-48" value={params.collection} onChange={(event) => setParams({ collection: event.target.value })}>
                            <option value="">Toutes les collections</option>
                            {options?.collections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name}
                                </option>
                            ))}
                        </SelectInput>
                        <button
                            type="button"
                            aria-pressed={params.featured}
                            onClick={() => setParams({ featured: !params.featured })}
                            className={cn(
                                'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                                params.featured ? 'border-accent bg-accent/10 text-ink' : 'border-line-strong text-muted hover:text-ink',
                            )}
                        >
                            <Star className={cn('size-4', params.featured && 'fill-accent text-accent')} aria-hidden />
                            Mis en avant
                        </button>
                        <SelectInput aria-label="Trier par" className="md:ml-auto md:w-56" value={params.sort} onChange={(event) => setParams({ sort: event.target.value })}>
                            {SORTS.map((sort) => (
                                <option key={sort.value} value={sort.value}>
                                    Tri : {sort.label}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                </div>

                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={8} columns={5} />
                ) : query.data.data.length === 0 ? (
                    filtered ? (
                        <EmptyState
                            icon={SearchX}
                            title="Aucun produit ne correspond"
                            description="Modifiez la recherche ou les filtres."
                            action={
                                <Button size="sm" icon={RotateCcw} onClick={() => resetParams()}>
                                    Effacer les filtres
                                </Button>
                            }
                        />
                    ) : archived ? (
                        <EmptyState icon={ArchiveRestore} title="Aucun produit archivé" description="Les produits archivés apparaissent ici et peuvent être restaurés." />
                    ) : (
                        <EmptyState
                            icon={Package}
                            title="Le catalogue est vide"
                            description="Créez votre premier parfum : formats, prix, notes et photos."
                            action={
                                <ButtonLink to="/produits/nouveau" variant="primary" size="sm" icon={Plus}>
                                    Nouveau produit
                                </ButtonLink>
                            }
                        />
                    )
                ) : (
                    <div aria-busy={query.fetching} className={cn('transition-opacity', query.fetching && 'opacity-60')}>
                        <DataTable caption={archived ? 'Produits archivés' : 'Produits du catalogue'}>
                            <thead>
                                <tr>
                                    <Th>Produit</Th>
                                    {!archived && <Th hideBelow="sm">Statut</Th>}
                                    <Th hideBelow="md" align="right">
                                        Prix
                                    </Th>
                                    <Th align="right">Stock</Th>
                                    {!archived && (
                                        <Th hideBelow="lg" align="right">
                                            Ventes
                                        </Th>
                                    )}
                                    <Th hideBelow="xl" align="right">
                                        {archived ? 'Archivé le' : 'Modifié le'}
                                    </Th>
                                    {archived && (
                                        <Th align="right">
                                            <span className="sr-only">Actions</span>
                                        </Th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.data.map((product) => {
                                    const cells = (
                                        <>
                                            <Td>
                                                <div className="flex items-center gap-3">
                                                    <Thumbnail product={product} />
                                                    <div className="min-w-0">
                                                        {archived ? (
                                                            <span className="block truncate font-medium text-ink">{product.name}</span>
                                                        ) : (
                                                            <Link to={`/produits/${product.id}`} className="block max-w-72 truncate rounded font-medium text-ink hover:text-accent">
                                                                {product.name}
                                                            </Link>
                                                        )}
                                                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                                                            {product.family?.name ?? 'Sans famille'}
                                                            {product.is_featured && (
                                                                <span className="inline-flex items-center gap-1 text-accent">
                                                                    <Star className="size-3 fill-current" aria-hidden />
                                                                    Mis en avant
                                                                </span>
                                                            )}
                                                            {product.is_demo && <span>· Démo</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Td>
                                            {!archived && (
                                                <Td hideBelow="sm">
                                                    <ProductStatusBadge status={product.status} />
                                                </Td>
                                            )}
                                            <Td hideBelow="md" align="right" className="whitespace-nowrap tabular-nums">
                                                {priceRange(product)}
                                            </Td>
                                            <Td align="right" className="whitespace-nowrap tabular-nums">
                                                {product.stock_total === 0 ? (
                                                    <Badge tone="danger">Rupture</Badge>
                                                ) : (
                                                    <span title={plural(product.variants?.length ?? 0, 'format')}>{formatNumber(product.stock_total ?? 0)}</span>
                                                )}
                                            </Td>
                                            {!archived && (
                                                <Td hideBelow="lg" align="right" className="tabular-nums text-muted">
                                                    {formatNumber(product.sales_count)}
                                                </Td>
                                            )}
                                            <Td hideBelow="xl" align="right" className="whitespace-nowrap text-xs text-muted tabular-nums">
                                                {formatShortDate(archived ? product.deleted_at : product.updated_at)}
                                            </Td>
                                            {archived && (
                                                <Td align="right">
                                                    <Button size="sm" icon={ArchiveRestore} loading={restoring === product.id} onClick={() => void restore(product)}>
                                                        Restaurer
                                                    </Button>
                                                </Td>
                                            )}
                                        </>
                                    );

                                    return archived ? (
                                        <tr key={product.id}>{cells}</tr>
                                    ) : (
                                        <LinkRow key={product.id} to={`/produits/${product.id}`}>
                                            {cells}
                                        </LinkRow>
                                    );
                                })}
                            </tbody>
                        </DataTable>
                        <Pagination meta={query.data.meta} onPage={(page) => setParams({ page })} noun="produits" />
                    </div>
                )}
            </Panel>
        </div>
    );
}
