import { Link, useParams } from 'react-router';
import { Mail, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { formatDate, formatDateTime, formatShortDate } from '@shared/format';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { normalizeMoroccanPhone } from '@shared/phone';
import * as api from '../../api';
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/feedback';
import { PageHeader, Panel } from '../../components/ui/Panel';
import { DataTable, LinkRow, Td, Th } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatNumber, telLink, whatsappLink } from '../../lib/format';
import { useCan } from '../../session';

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-line bg-raised p-4">
            <p className="text-2xs font-medium uppercase tracking-label text-muted">{label}</p>
            <p className="mt-1.5 text-lg font-semibold text-ink">{value}</p>
        </div>
    );
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const customerId = Number(id);
    const valid = Number.isInteger(customerId) && customerId > 0;
    const canManageOrders = useCan('manage-orders');
    const query = useApiQuery(valid ? `customer:${customerId}` : null, (signal) => api.customers.show(customerId, signal));
    const customer = query.data;
    useDocumentTitle(customer?.name ?? 'Client');

    const back = { to: '/clients', label: 'Clients' };

    if (!valid || (query.error && !customer)) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader back={back} title="Client" />
                <Panel>
                    <ErrorState error={query.error ?? new ApiError(404, 'Client introuvable.')} onRetry={query.reload} />
                </Panel>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex flex-col gap-6" aria-busy="true">
                <PageHeader back={back} title="Client" />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-20 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-72 w-full rounded-xl" />
            </div>
        );
    }

    const phone = customer.phone ? normalizeMoroccanPhone(customer.phone) : null;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                back={back}
                title={customer.name}
                meta={
                    <>
                        {!customer.is_active && <Badge tone="muted">Compte désactivé</Badge>}
                        <span className="text-xs text-muted">Client depuis le {formatDate(customer.created_at)}</span>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Commandes" value={formatNumber(customer.orders_count)} />
                <Stat label="Total dépensé" value={formatMoney(customer.total_spent)} />
                <Stat label="Panier moyen" value={customer.orders_count > 0 ? formatMoney(Math.round(customer.total_spent / customer.orders_count)) : '—'} />
                <Stat label="Dernière commande" value={customer.last_order_at ? formatShortDate(customer.last_order_at) : '—'} />
            </div>
            <p className="-mt-3 text-xs text-muted">Hors commandes annulées.</p>

            <div className="grid items-start gap-6 lg:grid-cols-3">
                <Panel title="Coordonnées" className="lg:order-2">
                    <ul className="flex flex-col gap-3 text-sm">
                        <li>
                            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-2 break-all text-ink hover:text-accent">
                                <Mail className="size-4 shrink-0 text-muted" aria-hidden />
                                {customer.email}
                            </a>
                        </li>
                        {customer.phone && (
                            <li className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="inline-flex items-center gap-2 tabular-nums text-ink">
                                    <Phone className="size-4 text-muted" aria-hidden />
                                    {customer.phone}
                                </span>
                                {phone && (
                                    <span className="flex gap-3 text-xs">
                                        <a href={telLink(phone)} className="text-muted underline underline-offset-4 hover:text-ink">
                                            Appeler
                                        </a>
                                        <a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted underline underline-offset-4 hover:text-ink">
                                            <MessageCircle className="size-3" aria-hidden />
                                            WhatsApp<span className="sr-only"> (nouvel onglet)</span>
                                        </a>
                                    </span>
                                )}
                            </li>
                        )}
                    </ul>
                </Panel>

                <Panel title="Historique des commandes" description="Les 50 dernières commandes passées avec ce compte." padded={false} className="lg:order-1 lg:col-span-2">
                    {customer.orders.length === 0 ? (
                        <EmptyState icon={ShoppingBag} title="Aucune commande" description="Ce client n’a pas encore commandé." />
                    ) : (
                        <DataTable caption="Commandes du client">
                            <thead>
                                <tr>
                                    <Th>Commande</Th>
                                    <Th>Statut</Th>
                                    <Th hideBelow="md">Paiement</Th>
                                    <Th align="right">Total</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {customer.orders.map((order) => {
                                    const cells = (
                                        <>
                                            <Td className="whitespace-nowrap">
                                                {canManageOrders ? (
                                                    <Link to={`/commandes/${order.reference}`} className="rounded font-medium text-ink hover:text-accent">
                                                        {order.reference}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium text-ink">{order.reference}</span>
                                                )}
                                                <span className="block text-xs text-muted tabular-nums">{formatDateTime(order.placed_at)}</span>
                                            </Td>
                                            <Td>
                                                <OrderStatusBadge status={order.status} label={order.status_label} />
                                            </Td>
                                            <Td hideBelow="md">
                                                <PaymentStatusBadge status={order.payment_status} label={order.payment_status_label} />
                                            </Td>
                                            <Td align="right" className="whitespace-nowrap font-medium tabular-nums">
                                                {formatMoney(order.total)}
                                            </Td>
                                        </>
                                    );

                                    return canManageOrders ? (
                                        <LinkRow key={order.reference} to={`/commandes/${order.reference}`}>
                                            {cells}
                                        </LinkRow>
                                    ) : (
                                        <tr key={order.reference}>{cells}</tr>
                                    );
                                })}
                            </tbody>
                        </DataTable>
                    )}
                </Panel>
            </div>
        </div>
    );
}
