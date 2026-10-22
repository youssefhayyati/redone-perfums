import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatDateTime } from '@shared/format';
import { api } from '../../api';
import { OrderDelivery, OrderItems, OrderStatusBadge, OrderTotals } from '../../components/order/OrderSummary';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useHead } from '../../hooks/useHead';
import { useQuery } from '../../hooks/useQuery';
import { RequireAuth } from './RequireAuth';

function OrderDetail() {
    const { reference = '' } = useParams();
    const { data, error, refetch } = useQuery(`account-order:${reference}`, (signal) => api.accountOrder(reference, { signal }), { staleTime: 15_000 });
    const order = data?.data;

    if (error?.isNotFound) {
        return (
            <EmptyState title="Commande introuvable" action={<ButtonLink to="/compte">Mes commandes</ButtonLink>}>
                <p>Cette commande n’est pas associée à votre compte.</p>
            </EmptyState>
        );
    }

    if (error && !order) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!order) {
        return <div className="skeleton h-96 w-full" role="status" aria-label="Chargement de la commande" />;
    }

    return (
        <div className="flex flex-col gap-10">
            <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
                <div className="flex flex-col gap-3">
                    <p className="eyebrow">Commande du {formatDateTime(order.placed_at)}</p>
                    <h1 className="font-display text-display-md tabular-nums lining-nums">{order.reference}</h1>
                </div>
                <OrderStatusBadge status={order.status} label={order.status_label} />
            </header>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <section className="flex flex-col gap-6" aria-label="Articles">
                    <OrderItems order={order} />
                    <OrderTotals order={order} />
                </section>
                <aside className="rounded-card border border-line bg-raised p-6">
                    <OrderDelivery order={order} />
                </aside>
            </div>
        </div>
    );
}

export default function AccountOrderPage() {
    useHead({ title: 'Ma commande', noindex: true });

    return (
        <div className="container-page pt-10 sm:pt-14">
            <Link to="/compte" className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
                <ArrowLeft className="size-4" strokeWidth={1.25} /> Mes commandes
            </Link>
            <RequireAuth>
                <OrderDetail />
            </RequireAuth>
        </div>
    );
}
