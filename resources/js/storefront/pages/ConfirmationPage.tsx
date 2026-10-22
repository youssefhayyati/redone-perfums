import { Link, useParams, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { formatMoney } from '@shared/money';
import { api } from '../api';
import { orderToken } from '../checkout';
import { OrderDelivery, OrderItems, OrderStatusBadge, OrderTotals } from '../components/order/OrderSummary';
import { ButtonLink } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { useHead } from '../hooks/useHead';
import { useQuery } from '../hooks/useQuery';
import { EASE_LUXE } from '../motion/easing';
import { useSession } from '../stores/session';

function Seal() {
    return (
        <svg viewBox="0 0 64 64" className="size-16 text-accent" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
            <motion.circle cx="32" cy="32" r="30" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE_LUXE }} />
            <motion.path d="M21 33l7 7 15-16" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.6, ease: EASE_LUXE, delay: 0.9 }} />
        </svg>
    );
}

export default function ConfirmationPage() {
    const { reference = '' } = useParams();
    const [params] = useSearchParams();
    const token = params.get('token') ?? orderToken(reference);
    const signedIn = useSession((state) => state.status === 'authenticated');
    const { data, error, refetch } = useQuery(`order:${reference}:${token ?? ''}`, (signal) => api.order(reference, token, { signal }), { staleTime: 0 });
    const order = data?.data;
    useHead({ title: 'Commande confirmée', noindex: true });

    if (error?.isNotFound) {
        return (
            <div className="container-page pt-12">
                <EmptyState title="Commande introuvable" action={<ButtonLink to="/compte">Mon compte</ButtonLink>}>
                    <p>Ce lien de confirmation n’est plus valide. Si vous avez un compte, retrouvez vos commandes dans votre espace.</p>
                </EmptyState>
            </div>
        );
    }

    if (error && !order) {
        return <ErrorState message={error.message} onRetry={refetch} />;
    }

    if (!order) {
        return (
            <div className="flex justify-center py-40 text-muted" role="status" aria-label="Chargement de la commande">
                <Spinner className="size-6" />
            </div>
        );
    }

    const firstName = order.customer_name.split(' ')[0];

    return (
        <div className="container-page max-w-4xl pt-16 sm:pt-24">
            <header className="flex flex-col items-center gap-6 text-center">
                <Seal />
                <p className="eyebrow">Commande enregistrée</p>
                <h1 className="font-display text-display-lg text-balance">Merci, {firstName}.</h1>
                <p className="max-w-lg text-muted">
                    Votre commande <span className="text-ink tabular-nums">{order.reference}</span> a bien été reçue.
                    {order.payment_method === 'cod' && <> Vous réglerez {formatMoney(order.total)} à la livraison.</>}
                </p>
                <OrderStatusBadge status={order.status} label={order.status_label} />
            </header>

            <div className="mt-16 flex flex-col gap-12 rounded-card border border-line bg-raised p-6 sm:p-10">
                <section aria-labelledby="items-title" className="flex flex-col gap-4">
                    <h2 id="items-title" className="eyebrow">
                        Récapitulatif
                    </h2>
                    <OrderItems order={order} />
                    <OrderTotals order={order} />
                </section>
                <OrderDelivery order={order} />
            </div>

            <div className="mt-12 flex flex-col items-center gap-6 text-center">
                <ButtonLink to="/boutique">Continuer mes achats</ButtonLink>
                {!signedIn && (
                    <p className="max-w-md text-sm text-muted">
                        Créez un compte pour retrouver vos prochaines commandes en un instant.{' '}
                        <Link to="/compte/inscription" className="text-ink underline underline-offset-4">
                            Créer un compte
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
