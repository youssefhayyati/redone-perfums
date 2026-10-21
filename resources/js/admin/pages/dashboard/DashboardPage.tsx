import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleCheck, Circle, Minus, PackageOpen, TriangleAlert } from 'lucide-react';
import { cn, formatDateTime, formatShortDate, plural } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { Segmented } from '../../components/ui/form';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { DataTable, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useListParams } from '../../hooks/useListParams';
import { describeChange, formatCompactMoney, formatLongDay, formatNumber, type Change } from '../../lib/format';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../lib/status';
import { toRouterPath } from '../../navigation';
import { hasPermission, useUser } from '../../session';
import type { DashboardDays, DashboardPayload, OrderStatus } from '../../types';
import { TrendChart } from './TrendChart';

const DEFAULTS = { days: '30' };
const ALLOWED = { days: ['7', '30', '90', '365'] } as const;

const PERIODS: Array<{ value: string; label: string; long: string; previous: string }> = [
    { value: '7', label: '7 j', long: '7 derniers jours', previous: 'vs 7 j précédents' },
    { value: '30', label: '30 j', long: '30 derniers jours', previous: 'vs 30 j précédents' },
    { value: '90', label: '90 j', long: '90 derniers jours', previous: 'vs 90 j précédents' },
    { value: '365', label: '12 mois', long: '12 derniers mois', previous: 'vs 12 mois précédents' },
];

type Metric = 'revenue' | 'orders';

function ChangeLabel({ change, comparison }: { change: Change | null; comparison: string }) {
    if (!change) {
        return <p className="mt-2 text-xs text-muted">Pas de comparaison disponible</p>;
    }

    const Icon = change.trend === 'up' ? ArrowUpRight : change.trend === 'down' ? ArrowDownRight : Minus;
    const tone = change.trend === 'up' ? 'text-success' : change.trend === 'down' ? 'text-danger' : 'text-muted';
    const spoken = change.trend === 'flat' ? 'stable' : `${change.trend === 'up' ? 'en hausse' : 'en baisse'} de ${change.label.replace(/^[+-]/, '')}`;

    return (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', tone)} aria-hidden>
                <Icon className="size-3.5" />
                {change.label}
            </span>
            <span aria-hidden>{comparison}</span>
            <span className="sr-only">
                {spoken}, {comparison.replace('vs', 'par rapport aux')}
            </span>
        </p>
    );
}

function StatTile({ label, value, footer, to }: { label: string; value: ReactNode; footer?: ReactNode; to?: string }) {
    const body = (
        <>
            <p className="text-2xs font-medium uppercase tracking-label text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
            {footer}
        </>
    );

    return to ? (
        <Link to={to} className="group block rounded-xl border border-line bg-raised p-4 transition-colors hover:border-line-strong sm:p-5">
            {body}
        </Link>
    ) : (
        <div className="rounded-xl border border-line bg-raised p-4 sm:p-5">{body}</div>
    );
}

function SetupChecklist({ items }: { items: DashboardPayload['setup'] }) {
    const done = items.filter((item) => item.done).length;

    if (done === items.length) {
        return null;
    }

    return (
        <Panel title="Mise en route" description={`${done} sur ${items.length} étapes terminées`}>
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {items.map((item) => (
                    <li key={item.key}>
                        <Link
                            to={toRouterPath(item.link)}
                            className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-ink/[0.04]"
                        >
                            {item.done ? (
                                <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                            ) : (
                                <Circle className="size-4 shrink-0 text-muted" aria-hidden />
                            )}
                            <span className={cn('min-w-0 flex-1', item.done ? 'text-muted line-through decoration-line-strong' : 'text-ink')}>{item.label}</span>
                            <span className="sr-only">{item.done ? '(terminé)' : '(à faire)'}</span>
                            {!item.done && <ArrowRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />}
                        </Link>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true">
            <span className="sr-only" role="status">
                Chargement du tableau de bord…
            </span>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="rounded-xl border border-line bg-raised p-5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-4 h-7 w-32" />
                        <Skeleton className="mt-3 h-3 w-28" />
                    </div>
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-xl border border-line bg-raised p-5 xl:col-span-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="mt-6 h-56 w-full" />
                </div>
                <div className="rounded-xl border border-line bg-raised p-5">
                    <Skeleton className="h-3 w-32" />
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton key={index} className="mt-5 h-4 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    useDocumentTitle('Tableau de bord');
    const user = useUser();
    const canSeeRevenue = hasPermission(user, 'view-revenue');
    const canManageOrders = hasPermission(user, 'manage-orders');
    const canManageCatalog = hasPermission(user, 'manage-catalog');
    const [params, setParams] = useListParams(DEFAULTS, ALLOWED);
    const days = Number(params.days) as DashboardDays;
    const period = PERIODS.find((entry) => entry.value === params.days) ?? PERIODS[1]!;
    const [metricChoice, setMetric] = useState<Metric>('revenue');
    const query = useApiQuery(`dashboard:${days}`, (signal) => api.dashboard.get(days, signal), { keepPrevious: true });
    const data = query.data;
    const revenueVisible = canSeeRevenue && data?.kpis.revenue !== null;
    const metric: Metric = revenueVisible ? metricChoice : 'orders';

    const points = useMemo(
        () => (data ? data.trend.map((day) => ({ date: day.date, value: metric === 'revenue' ? (day.revenue ?? 0) : day.orders })) : []),
        [data, metric],
    );

    const firstName = user?.name.split(' ')[0] ?? '';

    const header = (
        <PageHeader
            title="Tableau de bord"
            description={
                data
                    ? `Bonjour ${firstName}. Activité du ${formatShortDate(`${data.range.from}T12:00:00Z`)} au ${formatShortDate(`${data.range.to}T12:00:00Z`)}.`
                    : `Bonjour ${firstName}.`
            }
            actions={<Segmented label="Période" value={params.days} onChange={(value) => setParams({ days: value })} options={PERIODS} />}
        />
    );

    if (query.error && !data) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                <Panel>
                    <ErrorState error={query.error} onRetry={query.reload} />
                </Panel>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                <DashboardSkeleton />
            </div>
        );
    }

    const { kpis } = data;
    const breakdown = Array.isArray(data.status_breakdown) ? {} : data.status_breakdown;
    const breakdownTotal = ORDER_STATUSES.reduce((sum, status) => sum + (breakdown[status] ?? 0), 0);
    const bestMax = Math.max(1, ...data.best_sellers.map((item) => item.units));
    const totals = data.trend.reduce(
        (sum, day) => ({ revenue: sum.revenue + (day.revenue ?? 0), orders: sum.orders + day.orders }),
        { revenue: 0, orders: 0 },
    );
    const peak = points.reduce<{ date: string; value: number } | null>((best, point) => (best === null || point.value > best.value ? point : best), null);
    const formatMetric = (value: number) => (metric === 'revenue' ? formatMoney(value) : plural(value, 'commande'));

    return (
        <div className="flex flex-col gap-6">
            {header}

            <SetupChecklist items={data.setup} />

            <section aria-label="Indicateurs clés" className={cn('grid grid-cols-2 gap-3 transition-opacity', revenueVisible ? 'lg:grid-cols-5' : 'lg:grid-cols-3', query.fetching && 'opacity-60')}>
                {revenueVisible && (
                    <StatTile
                        label="Chiffre d’affaires"
                        value={formatMoney(kpis.revenue ?? 0)}
                        footer={<ChangeLabel change={describeChange(kpis.revenue, kpis.revenue_previous)} comparison={period.previous} />}
                    />
                )}
                <StatTile
                    label="Commandes"
                    value={formatNumber(kpis.orders)}
                    footer={<ChangeLabel change={describeChange(kpis.orders, kpis.orders_previous)} comparison={period.previous} />}
                />
                {revenueVisible && (
                    <StatTile
                        label="Panier moyen"
                        value={kpis.average_order_value === null ? '—' : formatMoney(kpis.average_order_value)}
                        footer={<ChangeLabel change={describeChange(kpis.average_order_value, kpis.average_order_value_previous)} comparison={period.previous} />}
                    />
                )}
                <StatTile
                    label="En attente"
                    value={formatNumber(kpis.pending_orders)}
                    to={canManageOrders ? '/commandes?status=pending' : undefined}
                    footer={<p className="mt-2 text-xs text-muted">{kpis.pending_orders > 0 ? 'À confirmer avec les clients' : 'Aucune commande à traiter'}</p>}
                />
                <StatTile
                    label="Annulées"
                    value={formatNumber(kpis.cancelled_orders)}
                    footer={<p className="mt-2 text-xs text-muted">Sur les {period.long}</p>}
                />
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
                <Panel
                    className="xl:col-span-2"
                    title={metric === 'revenue' ? 'Chiffre d’affaires par jour' : 'Commandes par jour'}
                    description="Hors commandes annulées"
                    actions={
                        revenueVisible && (
                            <Segmented
                                label="Indicateur du graphique"
                                size="sm"
                                value={metric}
                                onChange={setMetric}
                                options={[
                                    { value: 'revenue', label: 'Chiffre d’affaires' },
                                    { value: 'orders', label: 'Commandes' },
                                ]}
                            />
                        )
                    }
                >
                    <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                        <p className="text-muted">
                            Total <span className="font-medium text-ink">{metric === 'revenue' ? formatMoney(totals.revenue) : plural(totals.orders, 'commande')}</span>
                        </p>
                        {peak && peak.value > 0 && (
                            <p className="text-muted">
                                Meilleur jour <span className="font-medium text-ink">{formatLongDay(peak.date)}</span> · {formatMetric(peak.value)}
                            </p>
                        )}
                    </div>
                    <TrendChart
                        points={points}
                        seriesLabel={metric === 'revenue' ? 'Chiffre d’affaires' : 'Commandes'}
                        formatValue={formatMetric}
                        formatTick={metric === 'revenue' ? formatCompactMoney : (value) => formatNumber(value)}
                        unit={metric === 'revenue' ? 100 : 1}
                        integer={metric === 'orders'}
                        dimmed={query.fetching}
                    />
                    <div className="sr-only">
                        <table>
                            <caption>Détail quotidien sur les {period.long}</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Jour</th>
                                    {revenueVisible && <th scope="col">Chiffre d’affaires</th>}
                                    <th scope="col">Commandes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.trend.map((day) => (
                                    <tr key={day.date}>
                                        <th scope="row">{formatLongDay(day.date)}</th>
                                        {revenueVisible && <td>{formatMoney(day.revenue ?? 0)}</td>}
                                        <td>{day.orders}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel title="Répartition par statut" description={`${plural(breakdownTotal, 'commande passée', 'commandes passées')} sur la période`}>
                    {breakdownTotal === 0 ? (
                        <p className="py-6 text-center text-sm text-muted">Aucune commande sur la période.</p>
                    ) : (
                        <ul className="flex flex-col gap-3.5">
                            {ORDER_STATUSES.map((status: OrderStatus) => {
                                const count = breakdown[status] ?? 0;
                                const share = breakdownTotal > 0 ? count / breakdownTotal : 0;
                                const row = (
                                    <>
                                        <div className="flex items-center justify-between gap-3">
                                            <OrderStatusBadge status={status} />
                                            <span className="text-sm tabular-nums text-ink">
                                                {formatNumber(count)}
                                                <span className="ml-2 inline-block w-10 text-right text-xs text-muted">{Math.round(share * 100)} %</span>
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                                            <div className="h-full rounded-full bg-muted/70" style={{ width: `${share * 100}%` }} />
                                        </div>
                                    </>
                                );

                                return (
                                    <li key={status}>
                                        {canManageOrders ? (
                                            <Link
                                                to={`/commandes?status=${status}`}
                                                className="block rounded-md transition-opacity hover:opacity-80"
                                                aria-label={`${ORDER_STATUS_LABELS[status]} : ${count} (${Math.round(share * 100)} %). Voir ces commandes`}
                                            >
                                                {row}
                                            </Link>
                                        ) : (
                                            row
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>

                <Panel
                    className="xl:col-span-2"
                    title="Dernières commandes"
                    padded={false}
                    actions={
                        canManageOrders && (
                            <ButtonLink to="/commandes" size="sm" variant="ghost">
                                Toutes les commandes
                            </ButtonLink>
                        )
                    }
                >
                    {data.recent_orders.length === 0 ? (
                        <EmptyState icon={PackageOpen} title="Aucune commande pour l’instant" description="Les commandes passées sur la boutique apparaîtront ici." />
                    ) : (
                        <DataTable caption="Dernières commandes">
                            <thead>
                                <tr>
                                    <Th>Référence</Th>
                                    <Th hideBelow="sm">Client</Th>
                                    <Th>Statut</Th>
                                    {data.recent_orders.some((order) => order.total !== null) && <Th align="right">Total</Th>}
                                    <Th align="right" hideBelow="md">
                                        Date
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_orders.map((order) => (
                                    <tr key={order.reference} className="transition-colors hover:bg-ink/[0.03]">
                                        <Td className="font-medium whitespace-nowrap">
                                            {canManageOrders ? (
                                                <Link to={`/commandes/${order.reference}`} className="rounded text-ink hover:text-accent">
                                                    {order.reference}
                                                </Link>
                                            ) : (
                                                order.reference
                                            )}
                                        </Td>
                                        <Td hideBelow="sm">
                                            <span className="block max-w-56 truncate text-ink">{order.customer_name}</span>
                                            <span className="text-xs text-muted">{order.city}</span>
                                        </Td>
                                        <Td>
                                            <OrderStatusBadge status={order.status} />
                                        </Td>
                                        {order.total !== null && (
                                            <Td align="right" className="whitespace-nowrap tabular-nums">
                                                {formatMoney(order.total)}
                                            </Td>
                                        )}
                                        <Td align="right" hideBelow="md" className="whitespace-nowrap text-xs text-muted tabular-nums">
                                            {formatDateTime(order.placed_at)}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </DataTable>
                    )}
                </Panel>

                <div className="flex flex-col gap-6">
                    <Panel title="Meilleures ventes" description="Flacons vendus, coffrets compris">
                        {data.best_sellers.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted">Pas encore de ventes sur la période.</p>
                        ) : (
                            <ol className="flex flex-col gap-3">
                                {data.best_sellers.map((item, index) => (
                                    <li key={item.product_id}>
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span className="flex min-w-0 items-baseline gap-2.5">
                                                <span className="w-4 shrink-0 text-xs tabular-nums text-muted">{index + 1}</span>
                                                {canManageCatalog ? (
                                                    <Link to={`/produits/${item.product_id}`} className="truncate rounded text-ink hover:text-accent">
                                                        {item.name}
                                                    </Link>
                                                ) : (
                                                    <span className="truncate text-ink">{item.name}</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs tabular-nums text-muted">{plural(item.units, 'unité')}</span>
                                        </div>
                                        <div className="ml-6.5 mt-1.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                                            <div className="h-full rounded-full bg-accent/70" style={{ width: `${(item.units / bestMax) * 100}%` }} />
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>

                    {canManageCatalog && (
                        <Panel
                            title="Stock à surveiller"
                            padded={false}
                            actions={
                                <ButtonLink to="/stock?filter=low" size="sm" variant="ghost">
                                    Gérer le stock
                                </ButtonLink>
                            }
                        >
                            {data.low_stock.length === 0 ? (
                                <p className="px-5 py-6 text-center text-sm text-muted">Tous les formats sont au-dessus de leur seuil d’alerte.</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {data.low_stock.map((item) => (
                                        <li key={item.variant_id}>
                                            <Link
                                                to={`/stock?search=${encodeURIComponent(item.sku)}`}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-ink/[0.03] sm:px-5"
                                            >
                                                <TriangleAlert className={cn('size-4 shrink-0', item.stock <= 0 ? 'text-danger' : 'text-warning')} aria-hidden />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-ink">
                                                        {item.product} <span className="text-muted">· {item.label}</span>
                                                    </span>
                                                    <span className="block text-xs text-muted">{item.sku}</span>
                                                </span>
                                                <span className={cn('shrink-0 text-right text-sm font-medium tabular-nums', item.stock <= 0 ? 'text-danger' : 'text-warning')}>
                                                    {item.stock <= 0 ? 'Rupture' : item.stock}
                                                    <span className="block text-2xs font-normal text-muted">seuil {item.threshold}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    )}
                </div>
            </div>
        </div>
    );
}
