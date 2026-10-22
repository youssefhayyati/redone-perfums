import type { Order, OrderStatus } from '@shared/types';
import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';
import { t } from '../../i18n';

const STATUS_TONES: Record<OrderStatus, string> = {
    pending: 'border-warning/40 text-warning',
    confirmed: 'border-accent/50 text-accent',
    processing: 'border-accent/50 text-accent',
    shipped: 'border-line-strong text-ink',
    delivered: 'border-success/40 text-success',
    cancelled: 'border-danger/40 text-danger',
};

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label: string }) {
    return <span className={cn('inline-flex border px-2.5 py-1 text-2xs tracking-[0.16em] uppercase', STATUS_TONES[status])}>{label}</span>;
}

export function OrderItems({ order }: { order: Order }) {
    return (
        <ul className="divide-y divide-line border-y border-line">
            {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                        {/* Separate items with their own direction: a French snapshot ("30 ml") stays readable on Arabic pages. */}
                        <p className="flex flex-wrap items-baseline gap-x-2">
                            <span dir="auto" className="font-display text-xl">
                                {item.name}
                            </span>
                            {item.variant_label && (
                                <span dir="auto" className="text-xs text-muted">
                                    {item.variant_label}
                                </span>
                            )}
                            {item.quantity > 1 && <span className="text-xs text-muted">× {item.quantity}</span>}
                        </p>
                        <p className="text-sm tabular-nums">{formatMoney(item.line_total)}</p>
                    </div>
                    {item.selections.length > 0 && (
                        <ul className="flex flex-col gap-0.5 border-s border-line ps-3 text-xs text-muted">
                            {item.selections.map((selection, index) => (
                                <li key={index}>
                                    {selection.product_name} · {t('{sizes} ml', { sizes: selection.size_ml })}
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function OrderTotals({ order }: { order: Order }) {
    return (
        <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
                <dt className="text-muted">{t('Sous-total')}</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            {order.discount_total > 0 && (
                <div className="flex justify-between gap-4 text-success">
                    <dt>{order.coupon_code ? t('Réduction ({code})', { code: order.coupon_code }) : t('Réduction')}</dt>
                    <dd className="tabular-nums">−{formatMoney(order.discount_total)}</dd>
                </div>
            )}
            <div className="flex justify-between gap-4">
                <dt className="text-muted">{t('Livraison')}</dt>
                <dd className="tabular-nums">{order.delivery_fee === 0 ? t('Offerte') : formatMoney(order.delivery_fee)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-medium">{t('Total')}</dt>
                <dd className="font-display text-3xl tabular-nums lining-nums">{formatMoney(order.total)}</dd>
            </div>
        </dl>
    );
}

export function OrderDelivery({ order }: { order: Order }) {
    return (
        <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
                <dt className="eyebrow">{t('Livraison')}</dt>
                <dd className="text-ink">{order.customer_name}</dd>
                <dd className="whitespace-pre-line text-muted">{order.address}</dd>
                <dd className="text-muted">{order.city}</dd>
                {order.delivery_notes && <dd className="text-faint">{order.delivery_notes}</dd>}
            </div>
            <div className="flex flex-col gap-1">
                <dt className="eyebrow">{t('Contact')}</dt>
                <dd className="text-muted tabular-nums">
                    <span dir="ltr">{order.phone}</span>
                </dd>
                {order.email && <dd className="text-muted">{order.email}</dd>}
                <dt className="eyebrow mt-4">{t('Paiement')}</dt>
                <dd className="text-muted">{order.payment_method_label}</dd>
                {order.tracking_number && (
                    <>
                        <dt className="eyebrow mt-4">{t('Suivi')}</dt>
                        <dd className="text-muted">
                            {order.carrier ? `${order.carrier} · ` : ''}
                            {order.tracking_number}
                        </dd>
                    </>
                )}
            </div>
        </dl>
    );
}
