import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { formatMoney } from '@shared/money';
import type { Order } from '@shared/types';
import { orderItems, track } from '../analytics';
import { api } from '../api';
import { orderToken } from '../checkout';
import { OrderDelivery, OrderItems, OrderStatusBadge, OrderTotals } from '../components/order/OrderSummary';
import { ButtonLink } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { EASE_LUXE } from '../motion/easing';
import { RevealWords } from '../motion/Reveal';
import { useSession } from '../stores/session';
import { t, tNodes } from '../i18n';

function Seal() {
    return (
        <svg viewBox="0 0 64 64" className="size-16 text-accent" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
            <motion.circle cx="32" cy="32" r="30" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE_LUXE }} />
            <motion.path d="M21 33l7 7 15-16" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.6, ease: EASE_LUXE, delay: 0.9 }} />
        </svg>
    );
}

/** A reload or a return to this page must not count the sale twice. */
function trackPurchaseOnce(order: Order): void {
    const key = `rp-purchase:${order.reference}`;
    try {
        if (sessionStorage.getItem(key)) {
            return;
        }
        sessionStorage.setItem(key, '1');
    } catch {
        // No session storage: tracked at most once per page load.
    }
    track({ type: 'purchase', reference: order.reference, value: order.total, shipping: order.delivery_fee, items: orderItems(order) });
}

export default function ConfirmationPage() {
    const { reference = '' } = useParams();
    const [params] = useSearchParams();
    const token = params.get('token') ?? orderToken(reference);
    const signedIn = useSession((state) => state.status === 'authenticated');
    const { data, error, refetch } = useQuery(`order:${reference}:${token ?? ''}`, (signal) => api.order(reference, token, { signal }), { staleTime: 0 });
    const order = data?.data;
    useHead({ title: t('Commande confirmée'), noindex: true });

    useEffect(() => {
        if (order) {
            trackPurchaseOnce(order);
        }
    }, [order]);

    if (error?.isNotFound) {
        return (
            <div className="container-page pt-12">
                <EmptyState title={t('Commande introuvable')} action={<ButtonLink to="/compte">{t('Mon compte')}</ButtonLink>}>
                    <p>{t('Ce lien de confirmation n’est plus valide. Si vous avez un compte, retrouvez vos commandes dans votre espace.')}</p>
                </EmptyState>
            </div>
        );
    }

    if (error && !order) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!order) {
        return (
            <div className="flex justify-center py-40 text-muted" role="status" aria-label={t('Chargement de la commande')}>
                <Spinner className="size-6" />
            </div>
        );
    }

    const firstName = order.customer_name.split(' ')[0];

    return (
        <div className="container-page max-w-4xl pt-16 sm:pt-24">
            <header className="flex flex-col items-center gap-6 text-center">
                <Seal />
                <p className="eyebrow">{t('Commande enregistrée')}</p>
                <RevealWords as="h1" text={t('Merci, {name}.', { name: firstName })} className="font-display text-display-lg font-normal text-balance" delay={0.3} />
                <p className="max-w-lg text-muted">
                    {tNodes('Votre commande {reference} a bien été reçue.', { reference: <span className="text-ink tabular-nums">{order.reference}</span> })}
                    {order.payment_method === 'cod' && <> {t('Vous réglerez {amount} à la livraison.', { amount: formatMoney(order.total) })}</>}
                </p>
                <OrderStatusBadge status={order.status} label={order.status_label} />
            </header>

            <div className="mt-16 flex flex-col gap-12 rounded-card border border-line bg-raised p-6 sm:p-10">
                <section aria-labelledby="items-title" className="flex flex-col gap-4">
                    <h2 id="items-title" className="eyebrow">
                        {t('Récapitulatif')}
                    </h2>
                    <OrderItems order={order} />
                    <OrderTotals order={order} />
                </section>
                <OrderDelivery order={order} />
            </div>

            <div className="mt-12 flex flex-col items-center gap-6 text-center">
                <ButtonLink to="/boutique">{t('Continuer mes achats')}</ButtonLink>
                {!signedIn && (
                    <p className="max-w-md text-sm text-muted">
                        {t('Créez un compte pour retrouver vos prochaines commandes en un instant.')}{' '}
                        <Link to="/compte/inscription" className="text-ink underline underline-offset-4">
                            {t('Créer un compte')}
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
