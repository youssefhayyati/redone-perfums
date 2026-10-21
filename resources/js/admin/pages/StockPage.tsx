import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Boxes, History, SearchX, SlidersHorizontal } from 'lucide-react';
import { cn, formatDateTime } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../api';
import { AvailabilityBadge, Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState, ErrorState, InlineAlert, Skeleton, TableSkeleton } from '../components/ui/feedback';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Field, Segmented, TextInput } from '../components/ui/form';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader, Panel } from '../components/ui/Panel';
import { SearchInput } from '../components/ui/SearchInput';
import { DataTable, Td, Th } from '../components/ui/Table';
import { toast } from '../components/ui/toast';
import { useApiQuery } from '../hooks/useApiQuery';
import { invalidateCatalogOptions } from '../hooks/useCatalogOptions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useListParams } from '../hooks/useListParams';
import { errorText, toFieldErrors } from '../lib/errors';
import { formatNumber } from '../lib/format';
import { toApiQuery } from '../lib/query';
import { INVENTORY_REASON_LABELS } from '../lib/status';
import { stockAfter } from '../lib/stock';
import { useCan } from '../session';
import type { AdjustMode, InventoryRow } from '../types';
import { parseInteger } from './products/productForm';

const DEFAULTS = { filter: '', search: '', page: 1 };
const ALLOWED = { filter: ['', 'low', 'out'] };

function AdjustDialog({ row, onClose, onDone }: { row: InventoryRow | null; onClose: () => void; onDone: (row: InventoryRow) => void }) {
    const [mode, setMode] = useState<AdjustMode>('add');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quantityError, setQuantityError] = useState<string | undefined>();

    useEffect(() => {
        if (row) {
            setMode('add');
            setQuantity('');
            setNote('');
            setError(null);
            setQuantityError(undefined);
        }
    }, [row]);

    const parsed = parseInteger(quantity);
    const preview = row && parsed !== null ? stockAfter(row.stock, mode, parsed) : null;

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!row) {
            return;
        }
        if (parsed === null || (mode !== 'set' && parsed < 1)) {
            setQuantityError(mode === 'set' ? 'Nombre entier, 0 ou plus.' : 'Nombre entier, 1 ou plus.');

            return;
        }
        if (preview !== null && preview < 0) {
            setQuantityError('Le stock ne peut pas devenir négatif.');

            return;
        }
        setBusy(true);
        setError(null);
        setQuantityError(undefined);
        try {
            const updated = await api.inventory.adjust(row.id, mode, parsed, note.trim() === '' ? null : note.trim());
            invalidateCatalogOptions();
            onDone(updated);
            toast.success(`Stock de ${row.product ?? 'ce format'} (${row.label}) : ${updated.stock}.`);
            onClose();
        } catch (failure) {
            const fields = toFieldErrors(failure);
            if (fields.quantity) {
                setQuantityError(fields.quantity);
            } else {
                setError(fields.stock ?? fields.mode ?? errorText(failure));
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={row !== null}
            onClose={onClose}
            busy={busy}
            size="sm"
            title="Ajuster le stock"
            description={row ? `${row.product ?? '—'} · ${row.label} · ${row.sku}` : undefined}
            footer={
                <>
                    <Button onClick={onClose} disabled={busy}>
                        Annuler
                    </Button>
                    <Button type="submit" form="adjust-form" variant="primary" loading={busy}>
                        Enregistrer
                    </Button>
                </>
            }
        >
            <form id="adjust-form" onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                {error && (
                    <InlineAlert tone="danger" live>
                        {error}
                    </InlineAlert>
                )}
                <Segmented
                    label="Type d’ajustement"
                    value={mode}
                    onChange={setMode}
                    options={[
                        { value: 'add', label: 'Réassort (+)' },
                        { value: 'remove', label: 'Retrait (−)' },
                        { value: 'set', label: 'Inventaire (=)' },
                    ]}
                />
                <Field
                    label={mode === 'set' ? 'Stock compté' : 'Quantité'}
                    required
                    error={quantityError}
                    hint={row ? `Stock actuel : ${row.stock}${preview !== null ? ` → après : ${preview}` : ''}` : undefined}
                >
                    {(control) => <TextInput {...control} inputMode="numeric" className="w-32 tabular-nums" value={quantity} onChange={(event) => setQuantity(event.target.value)} data-autofocus />}
                </Field>
                <Field label="Motif" optional hint="Ex. réception fournisseur, casse, inventaire mensuel." counter={{ value: note.length, max: 255 }}>
                    {(control) => <TextInput {...control} maxLength={255} value={note} onChange={(event) => setNote(event.target.value)} />}
                </Field>
            </form>
        </Dialog>
    );
}

function MovementsDrawer({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
    const canSeeOrders = useCan('manage-orders');
    const query = useApiQuery(row ? `movements:${row.id}:${row.stock}` : null, (signal) => api.inventory.movements(row!.id, signal));

    return (
        <Drawer open={row !== null} onClose={onClose} title="Historique du stock" description={row ? `${row.product ?? '—'} · ${row.label} · ${row.sku}` : undefined} width="max-w-lg">
            <div className="px-5 py-4">
                {query.error ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <div className="flex flex-col gap-4" aria-busy="true">
                        {Array.from({ length: 5 }, (_, index) => (
                            <Skeleton key={index} className="h-12 w-full" />
                        ))}
                    </div>
                ) : query.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">Aucun mouvement enregistré.</p>
                ) : (
                    <ol className="flex flex-col divide-y divide-line">
                        {query.data.map((movement) => (
                            <li key={movement.id} className="flex items-start gap-4 py-3">
                                <span className={cn('w-12 shrink-0 text-right text-sm font-semibold tabular-nums', movement.change > 0 ? 'text-success' : 'text-danger')}>
                                    {movement.change > 0 ? `+${movement.change}` : `−${Math.abs(movement.change)}`}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-ink">
                                        {INVENTORY_REASON_LABELS[movement.reason] ?? movement.reason}
                                        {movement.order &&
                                            (canSeeOrders ? (
                                                <>
                                                    {' · '}
                                                    <Link to={`/commandes/${movement.order}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                                                        {movement.order}
                                                    </Link>
                                                </>
                                            ) : (
                                                ` · ${movement.order}`
                                            ))}
                                    </p>
                                    {movement.note && <p className="mt-0.5 text-sm text-muted">{movement.note}</p>}
                                    <p className="mt-0.5 text-xs text-muted">
                                        {formatDateTime(movement.created_at)}
                                        {movement.user && ` · ${movement.user}`}
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs tabular-nums text-muted">→ {movement.stock_after}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </Drawer>
    );
}

export default function StockPage() {
    useDocumentTitle('Stock');
    const [params, setParams, resetParams] = useListParams(DEFAULTS, ALLOWED);
    const query = useApiQuery(JSON.stringify(params), (signal) => api.inventory.list({ ...toApiQuery(params), per_page: 25 }, signal), { keepPrevious: true });
    const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
    const [history, setHistory] = useState<InventoryRow | null>(null);
    const counts = query.data?.counts;

    const replaceRow = (row: InventoryRow) => query.setData((current) => (current ? { ...current, data: current.data.map((item) => (item.id === row.id ? row : item)) } : current));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Stock" description="Quantités par format, ajustements et historique des mouvements." />
            <Panel padded={false}>
                <div className="flex flex-col gap-3 px-4 pt-3 sm:px-5">
                    <FilterTabs
                        label="Filtrer le stock"
                        value={params.filter}
                        onChange={(filter) => setParams({ filter })}
                        tabs={[
                            { value: '', label: 'Tous les formats' },
                            { value: 'low', label: 'Stock faible', count: counts?.low },
                            { value: 'out', label: 'Rupture', count: counts?.out },
                        ]}
                    />
                    <div className="pb-4 pt-1">
                        <SearchInput className="md:w-80" label="Rechercher un format" placeholder="Parfum ou référence (SKU)" value={params.search} onChange={(search) => setParams({ search }, { replace: true })} />
                    </div>
                </div>
                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={10} columns={5} />
                ) : query.data.data.length === 0 ? (
                    params.search || params.filter ? (
                        <EmptyState
                            icon={SearchX}
                            title={params.filter === 'out' && !params.search ? 'Aucune rupture' : params.filter === 'low' && !params.search ? 'Aucun stock faible' : 'Aucun format ne correspond'}
                            description={params.search ? 'Vérifiez la recherche.' : 'Tous les formats sont au-dessus de leur seuil d’alerte.'}
                            action={
                                <Button size="sm" onClick={resetParams}>
                                    Voir tous les formats
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState icon={Boxes} title="Aucun format en stock" description="Les formats créés sur les fiches produits apparaissent ici." />
                    )
                ) : (
                    <div aria-busy={query.fetching} className={cn('transition-opacity', query.fetching && 'opacity-60')}>
                        <DataTable caption="Stock par format">
                            <thead>
                                <tr>
                                    <Th>Format</Th>
                                    <Th hideBelow="md">Référence</Th>
                                    <Th hideBelow="lg" align="right">
                                        Prix
                                    </Th>
                                    <Th align="right">Stock</Th>
                                    <Th hideBelow="sm">État</Th>
                                    <Th align="right">
                                        <span className="sr-only">Actions</span>
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.data.map((row) => (
                                    <tr key={row.id} className="transition-colors hover:bg-ink/[0.03]">
                                        <Td>
                                            <Link to={`/produits/${row.product_id}`} className="block max-w-64 truncate rounded font-medium text-ink hover:text-accent">
                                                {row.product ?? '—'}
                                            </Link>
                                            <span className="text-xs text-muted">
                                                {row.label}
                                                {row.product_status !== 'active' && ' · produit non publié'}
                                                {!row.is_active && ' · format inactif'}
                                            </span>
                                        </Td>
                                        <Td hideBelow="md" className="font-mono text-xs text-muted">
                                            {row.sku}
                                        </Td>
                                        <Td hideBelow="lg" align="right" className="whitespace-nowrap tabular-nums text-muted">
                                            {formatMoney(row.price)}
                                        </Td>
                                        <Td align="right" className="whitespace-nowrap">
                                            <span className={cn('text-base font-semibold tabular-nums', row.stock <= 0 ? 'text-danger' : row.stock <= row.low_stock_threshold ? 'text-warning' : 'text-ink')}>
                                                {formatNumber(row.stock)}
                                            </span>
                                            <span className="block text-2xs text-muted">seuil {row.low_stock_threshold}</span>
                                        </Td>
                                        <Td hideBelow="sm">
                                            {row.is_active ? <AvailabilityBadge availability={row.availability} /> : <Badge tone="muted">Inactif</Badge>}
                                        </Td>
                                        <Td align="right" className="whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" icon={SlidersHorizontal} onClick={() => setAdjusting(row)}>
                                                    <span className="hidden sm:inline">Ajuster</span>
                                                    <span className="sr-only sm:hidden">Ajuster le stock de {row.product} {row.label}</span>
                                                </Button>
                                                <Button size="sm" variant="ghost" icon={History} onClick={() => setHistory(row)} aria-label={`Historique de ${row.product ?? ''} ${row.label}`}>
                                                    <span className="hidden lg:inline">Historique</span>
                                                </Button>
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </DataTable>
                        <Pagination meta={query.data.meta} onPage={(page) => setParams({ page })} noun="formats" />
                    </div>
                )}
            </Panel>

            <AdjustDialog
                row={adjusting}
                onClose={() => setAdjusting(null)}
                onDone={(row) => {
                    replaceRow(row);
                    // Counts of low / out-of-stock formats may have changed.
                    query.reload();
                }}
            />
            <MovementsDrawer row={history} onClose={() => setHistory(null)} />
        </div>
    );
}
