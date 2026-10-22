import type { Cart } from '@shared/types';
import { formatMoney } from '@shared/money';
import { t, tNodes } from '../../i18n';

/** Server-computed totals. Delivery is known once a deliverable city is chosen. */
export function Totals({ cart }: { cart: Cart }) {
    const delivery = cart.delivery;

    return (
        <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
                <dt className="text-muted">{t('Sous-total')}</dt>
                <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
            {cart.discount_total > 0 && (
                <div className="flex justify-between gap-4 text-success">
                    <dt>{cart.coupon ? t('Réduction ({code})', { code: cart.coupon.code }) : t('Réduction')}</dt>
                    <dd className="tabular-nums">−{formatMoney(cart.discount_total)}</dd>
                </div>
            )}
            <div className="flex justify-between gap-4">
                <dt className="text-muted">{delivery && !delivery.error ? t('Livraison · {city}', { city: delivery.city }) : t('Livraison')}</dt>
                <dd className="text-end tabular-nums">
                    {!delivery ? <span className="text-muted">{t('Selon votre ville')}</span> : delivery.error ? <span className="text-warning">{t('Indisponible')}</span> : delivery.fee === 0 ? <span className="text-success">{t('Offerte')}</span> : formatMoney(delivery.fee ?? 0)}
                </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-medium">{cart.total !== null ? t('Total') : t('Total hors livraison')}</dt>
                <dd className="font-display text-3xl tabular-nums lining-nums">{formatMoney(cart.total ?? cart.merchandise_total)}</dd>
            </div>
        </dl>
    );
}

export function FreeShippingHint({ cart }: { cart: Cart }) {
    const remaining = cart.delivery?.remaining_for_free_shipping;
    const threshold = cart.delivery?.free_shipping_threshold;

    if (!remaining || !threshold) {
        return null;
    }

    const progress = Math.min(100, Math.max(0, ((threshold - remaining) / threshold) * 100));

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">
                {tNodes('Plus que {amount} pour la livraison offerte à {city}.', {
                    amount: <span className="text-ink tabular-nums">{formatMoney(remaining)}</span>,
                    city: cart.delivery?.city,
                })}
            </p>
            <div className="h-px bg-line" aria-hidden="true">
                <div className="h-px bg-accent transition-[width] duration-700 ease-luxe" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}
