import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { formatDateTime, plural } from '@shared/format';
import { formatMoney } from '@shared/money';
import * as api from '../../api';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/feedback';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { AdminOrder, OrderSlips } from '../../types';

const LIMIT = 100;

/** One A5 sheet for the courier: who to deliver, what is in the parcel, what to collect. */
function Slip({ order, store }: { order: AdminOrder; store: OrderSlips['store'] }) {
    const cashDue = order.payment_method === 'cod' && order.payment_status !== 'paid';

    return (
        <article className="flex min-h-[210mm] w-[148mm] max-w-full flex-col gap-6 bg-white p-[10mm] text-[13px] leading-snug text-black shadow-lg break-after-page last:break-after-auto print:shadow-none">
            <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
                <div>
                    <p className="text-xl font-semibold">{store.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em]">Bon de livraison</p>
                </div>
                {store.phone && <p className="text-end text-xs">Service client<br /><span className="text-sm font-semibold tabular-nums">{store.phone}</span></p>}
            </header>

            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/60">Commande</p>
                    <p className="font-mono text-2xl font-semibold">{order.reference}</p>
                </div>
                <p className="text-xs text-black/60">{formatDateTime(order.placed_at)}</p>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4">
                <section>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/60">Destinataire</p>
                    <p dir="auto" className="mt-1 text-base font-semibold">{order.customer_name}</p>
                    <p className="text-lg font-semibold tabular-nums">{order.phone}</p>
                    <p dir="auto" className="mt-1 whitespace-pre-line">{order.address}</p>
                    <p className="font-semibold">
                        {order.city}
                        {order.delivery_zone && <span className="font-normal text-black/60"> · {order.delivery_zone}</span>}
                    </p>
                </section>
                <section className="flex min-w-[42mm] flex-col items-center justify-center rounded-md border-2 border-black px-3 py-2 text-center">
                    {cashDue ? (
                        <>
                            <p className="text-xs uppercase tracking-[0.18em]">À encaisser</p>
                            <p className="text-2xl font-bold tabular-nums">{formatMoney(order.total)}</p>
                        </>
                    ) : (
                        <p className="text-lg font-bold uppercase">Déjà payée</p>
                    )}
                </section>
            </div>

            {order.delivery_notes && (
                <p dir="auto" className="rounded-md border border-black/30 px-3 py-2">
                    <span className="font-semibold">Instructions : </span>
                    {order.delivery_notes}
                </p>
            )}

            <section>
                <p className="text-xs uppercase tracking-[0.18em] text-black/60">Contenu du colis · {plural(order.items_count, 'article')}</p>
                <table className="mt-2 w-full border-collapse">
                    <tbody>
                        {(order.items ?? []).map((item) => (
                            <tr key={item.id} className="border-t border-black/20 align-top">
                                <td className="w-10 py-1.5 font-semibold tabular-nums">{item.quantity} ×</td>
                                <td dir="auto" className="py-1.5">
                                    {item.name}
                                    {item.variant_label && <span className="text-black/60"> · {item.variant_label}</span>}
                                    {item.selections.length > 0 && (
                                        <ul className="mt-0.5 text-xs text-black/70">
                                            {item.selections.map((selection) => (
                                                <li key={selection.position}>
                                                    — {selection.product_name} · {selection.size_ml} ml
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                                <td className="py-1.5 text-end font-mono text-xs text-black/60">{item.sku}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {(order.carrier || order.tracking_number) && (
                <p className="text-xs">
                    {order.carrier && <>Transporteur : <span className="font-semibold">{order.carrier}</span></>}
                    {order.carrier && order.tracking_number && ' · '}
                    {order.tracking_number && <>Suivi : <span className="font-mono font-semibold">{order.tracking_number}</span></>}
                </p>
            )}

            <footer className="mt-auto grid grid-cols-2 gap-6 pt-6 text-xs">
                <p className="border-t border-black pt-1">Date de livraison</p>
                <p className="border-t border-black pt-1">Signature du client</p>
            </footer>
        </article>
    );
}

/**
 * Printable delivery slips, opened in a new tab from the orders list (its filters) or an
 * order (`?references=`). Opens the print dialog once loaded.
 */
export default function DeliverySlipsPage() {
    const [params] = useSearchParams();
    const query = Object.fromEntries(params);
    const slips = useApiQuery(`slips:${params.toString()}`, (signal) => api.orders.slips(query, signal));
    const orders = slips.data?.data ?? [];
    useDocumentTitle('Bons de livraison');

    useEffect(() => {
        if (orders.length === 0) {
            return;
        }
        const timer = window.setTimeout(() => window.print(), 500);

        return () => window.clearTimeout(timer);
    }, [orders.length]);

    return (
        <div className="flex min-h-dvh flex-col items-center gap-6 bg-sunken pb-16 print:block print:bg-white print:p-0">
            <div className="sticky top-0 z-10 flex w-full items-center justify-between gap-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur print:hidden sm:px-6">
                <Link to="/commandes" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
                    <ArrowLeft className="size-4" aria-hidden />
                    Commandes
                </Link>
                <p className="text-sm text-muted">
                    {slips.data && plural(orders.length, 'bon')}
                    {orders.length === LIMIT && ' — limite atteinte : filtrez la liste pour imprimer les suivants'}
                </p>
                <Button variant="primary" icon={Printer} onClick={() => window.print()} disabled={orders.length === 0}>
                    Imprimer
                </Button>
            </div>

            {slips.error && !slips.data ? (
                <ErrorState error={slips.error} onRetry={slips.reload} />
            ) : !slips.data ? (
                <Spinner className="mt-16" label="Préparation des bons…" />
            ) : orders.length === 0 ? (
                <EmptyState title="Aucune commande à imprimer" description="Aucune commande ne correspond à cette sélection." />
            ) : (
                orders.map((order) => <Slip key={order.id} order={order} store={slips.data!.store} />)
            )}
        </div>
    );
}
