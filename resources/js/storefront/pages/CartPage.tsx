import { TriangleAlert } from 'lucide-react';
import { CartLineItem } from '../components/cart/CartLineItem';
import { CitySelect } from '../components/cart/CitySelect';
import { CouponForm } from '../components/cart/CouponForm';
import { FreeShippingHint, Totals } from '../components/cart/Totals';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/States';
import { useConfig } from '../config';
import { useHead } from '../hooks/useHead';
import { cartActions, useCart } from '../stores/cart';
import { t, tn } from '../i18n';

export default function CartPage() {
    const config = useConfig();
    const cart = useCart((state) => state.cart);
    const loading = useCart((state) => state.loading);
    const cityId = useCart((state) => state.cityId);
    useHead({ title: t('Panier'), noindex: true });

    if (loading && !cart) {
        return (
            <div className="flex justify-center py-40 text-muted" role="status" aria-label={t('Chargement du panier')}>
                <Spinner className="size-6" />
            </div>
        );
    }

    if (!cart || cart.lines.length === 0) {
        return (
            <div className="container-page pt-12">
                <EmptyState title={t('Votre panier est vide')} action={<ButtonLink to="/boutique">{t('Découvrir la boutique')}</ButtonLink>}>
                    <p>{t('Explorez nos signatures, ou composez un coffret à votre image.')}</p>
                </EmptyState>
            </div>
        );
    }

    const hasIssues = cart.lines.some((line) => line.issues.length > 0);

    return (
        <div className="container-page pt-12 sm:pt-16">
            <PageHeader label={t('Panier')} title={t('Votre panier')} meta={tn(cart.items_count, 'article')} />

            <div className="grid grid-cols-1 gap-12 pt-4 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
                <section aria-label={t('Articles')}>
                    {hasIssues && (
                        <p role="alert" className="mt-6 flex items-start gap-3 border-l-2 border-warning bg-warning/8 px-4 py-3 text-sm">
                            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.5} />
                            {t('Certains articles demandent votre attention avant de commander.')}
                        </p>
                    )}
                    <ul className="divide-y divide-line">
                        {cart.lines.map((line) => (
                            <CartLineItem key={line.id} line={line} maxQuantity={cart.max_quantity} />
                        ))}
                    </ul>
                </section>

                <aside aria-label={t('Récapitulatif')} className="lg:pt-6">
                    <div className="flex flex-col gap-7 rounded-card border border-line bg-raised p-6 sm:p-8 lg:sticky lg:top-24">
                        <h2 className="font-display text-2xl">{t('Récapitulatif')}</h2>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="cart-city" className="eyebrow">
                                {t('Ville de livraison')}
                            </label>
                            <CitySelect id="cart-city" value={cityId} onChange={(id) => void cartActions.setCity(id)} />
                            {cart.delivery?.estimate && !cart.delivery.error && <p className="text-xs text-muted">{t('Délai indicatif : {estimate}', { estimate: cart.delivery.estimate })}</p>}
                            {cart.delivery?.error && (
                                <p role="alert" className="text-xs text-warning">
                                    {cart.delivery.error}
                                </p>
                            )}
                        </div>

                        <FreeShippingHint cart={cart} />
                        <CouponForm cart={cart} />
                        <Totals cart={cart} />

                        <ButtonLink to="/commande" size="lg" aria-disabled={!cart.is_checkout_ready || undefined}>
                            {t('Passer commande')}
                        </ButtonLink>
                        {config.payment_methods.length > 0 && <p className="text-center text-xs text-muted">{config.payment_methods.map((method) => method.description).join(' ')}</p>}
                    </div>
                </aside>
            </div>
        </div>
    );
}
