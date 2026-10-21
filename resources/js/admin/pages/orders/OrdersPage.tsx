import { Link } from 'react-router';
import { Inbox, RotateCcw, SearchX } from 'lucide-react';
import { cn, formatDateTime, formatShortDate, plural } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/ui/feedback';
import { FilterTabs } from '../../components/ui/FilterTabs';
import { SelectInput, TextInput } from '../../components/ui/form';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useListParams } from '../../hooks/useListParams';
import { storeToday } from '../../lib/datetime';
import { toApiQuery } from '../../lib/query';
import { ORDER_STATUSES, ORDER_STATUS_PLURALS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '../../lib/status';

const DEFAULTS = { status: '', payment_status: '', from: '', to: '', search: '', page: 1 };
const ALLOWED = { status: ['', ...ORDER_STATUSES], payment_status: ['', ...PAYMENT_STATUSES] };

export default function OrdersPage() {
    useDocumentTitle('Commandes');
    const [params, setParams, resetParams] = useListParams(DEFAULTS, ALLOWED);
    const key = JSON.stringify(params);
    const query = useApiQuery(key, (signal) => api.orders.list({ ...toApiQuery(params), per_page: 20 }, signal), { keepPrevious: true });
    const counts = query.data && !Array.isArray(query.data.counts) ? query.data.counts : {};
    const total = ORDER_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
    const filtered = params.payment_status !== '' || params.from !== '' || params.to !== '' || params.search !== '';
    const today = storeToday();

    const tabs = [
        { value: '', label: 'Toutes', count: query.data ? total : undefined },
        ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_PLURALS[status], count: query.data ? (counts[status] ?? 0) : undefined })),
    ];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Commandes"
                description="Confirmez les commandes par téléphone, préparez-les puis suivez leur livraison."
            />

            <Panel padded={false}>
                <div className="flex flex-col gap-3 px-4 pt-3 sm:px-5">
                    <FilterTabs label="Filtrer par statut" tabs={tabs} value={params.status} onChange={(status) => setParams({ status })} />
                    <div className="flex flex-col gap-2 pb-4 pt-1 md:flex-row md:flex-wrap md:items-center">
                        <SearchInput
                            className="md:w-80"
                            label="Rechercher une commande"
                            placeholder="Référence, nom, e-mail ou téléphone"
                            value={params.search}
                            onChange={(search) => setParams({ search }, { replace: true })}
                        />
                        <SelectInput
                            aria-label="Statut du paiement"
                            className="md:w-48"
                            value={params.payment_status}
                            onChange={(event) => setParams({ payment_status: event.target.value })}
                        >
                            <option value="">Tous les paiements</option>
                            {PAYMENT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {PAYMENT_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </SelectInput>
                        <div className="flex items-center gap-2">
                            <label className="sr-only" htmlFor="orders-from">
                                Passées à partir du
                            </label>
                            <TextInput
                                id="orders-from"
                                type="date"
                                className="md:w-40"
                                value={params.from}
                                max={params.to || today}
                                onChange={(event) => setParams({ from: event.target.value })}
                            />
                            <span className="text-xs text-muted" aria-hidden>
                                au
                            </span>
                            <label className="sr-only" htmlFor="orders-to">
                                Passées jusqu’au
                            </label>
                            <TextInput
                                id="orders-to"
                                type="date"
                                className="md:w-40"
                                value={params.to}
                                min={params.from || undefined}
                                max={today}
                                onChange={(event) => setParams({ to: event.target.value })}
                            />
                        </div>
                        {(filtered || params.status !== '') && (
                            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetParams} className="md:ml-auto">
                                Réinitialiser
                            </Button>
                        )}
                    </div>
                </div>

                {query.error && !query.data ? (
                    <ErrorState error={query.error} onRetry={query.reload} />
                ) : !query.data ? (
                    <TableSkeleton rows={8} columns={6} />
                ) : query.data.data.length === 0 ? (
                    filtered || params.status !== '' ? (
                        <EmptyState
                            icon={SearchX}
                            title="Aucune commande ne correspond à ces filtres"
                            description="Vérifiez l’orthographe ou élargissez la période."
                            action={
                                <Button size="sm" onClick={resetParams}>
                                    Effacer les filtres
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState icon={Inbox} title="Aucune commande pour l’instant" description="Les commandes passées sur la boutique apparaîtront ici." />
                    )
                ) : (
                    <div aria-busy={query.fetching} className={cn('transition-opacity', query.fetching && 'opacity-60')}>
                        <DataTable caption="Liste des commandes">
                            <thead>
                                <tr>
                                    <Th>Commande</Th>
                                    <Th hideBelow="sm">Client</Th>
                                    <Th>Statut</Th>
                                    <Th hideBelow="md">Paiement</Th>
                                    <Th hideBelow="lg" align="right">
                                        Articles
                                    </Th>
                                    <Th align="right" hideBelow="sm">
                                        Total
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.data.map((order) => (
                                    <LinkRow key={order.reference} to={`/commandes/${order.reference}`}>
                                        <Td className="whitespace-nowrap">
                                            <Link to={`/commandes/${order.reference}`} className="rounded font-medium text-ink hover:text-accent">
                                                {order.reference}
                                            </Link>
                                            <span className="block text-xs text-muted tabular-nums" title={formatDateTime(order.placed_at)}>
                                                {formatShortDate(order.placed_at)}
                                                <span className="sm:hidden"> · {formatMoney(order.total)}</span>
                                            </span>
                                            <span className="block max-w-40 truncate text-xs text-muted sm:hidden">{order.customer_name}</span>
                                        </Td>
                                        <Td hideBelow="sm">
                                            <span className="block max-w-60 truncate text-ink">{order.customer_name}</span>
                                            <span className="text-xs text-muted">
                                                {order.city} · {order.phone}
                                            </span>
                                        </Td>
                                        <Td>
                                            <OrderStatusBadge status={order.status} label={order.status_label} />
                                        </Td>
                                        <Td hideBelow="md">
                                            <PaymentStatusBadge status={order.payment_status} label={order.payment_status_label} />
                                        </Td>
                                        <Td hideBelow="lg" align="right" className="tabular-nums text-muted">
                                            {plural(order.items_count, 'article')}
                                        </Td>
                                        <Td align="right" hideBelow="sm" className="whitespace-nowrap font-medium tabular-nums">
                                            {formatMoney(order.total)}
                                        </Td>
                                    </LinkRow>
                                ))}
                            </tbody>
                        </DataTable>
                        <Pagination meta={query.data.meta} onPage={(page) => setParams({ page })} noun="commandes" />
                    </div>
                )}
            </Panel>
        </div>
    );
}
