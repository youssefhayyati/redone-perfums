import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { formatMoney } from '@shared/money';
import { EASE_LUXE } from '../../motion/easing';
import { useCart } from '../../stores/cart';
import { ui, useUi } from '../../stores/ui';
import { ButtonLink } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Spinner } from '../ui/Spinner';
import { CartLineItem } from './CartLineItem';
import { t, tn } from '../../i18n';

export function CartDrawer() {
    const open = useUi((state) => state.overlay === 'cart');
    const cart = useCart((state) => state.cart);
    const loading = useCart((state) => state.loading);
    const count = cart?.items_count ?? 0;
    const empty = !cart || cart.lines.length === 0;

    return (
        <Drawer
            open={open}
            onClose={ui.close}
            title={
                <>
                    {t('Votre panier')}
                    {count > 0 && <span className="ms-3 align-middle font-sans text-xs tracking-[0.16em] text-muted uppercase">{tn(count, 'article')}</span>}
                </>
            }
            footer={
                !empty && cart ? (
                    <div className="flex flex-col gap-4">
                        <dl className="flex flex-col gap-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted">{t('Sous-total')}</dt>
                                <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
                            </div>
                            {cart.discount_total > 0 && (
                                <div className="flex justify-between text-success">
                                    <dt>{t('Code {code}', { code: cart.coupon?.code ?? '' })}</dt>
                                    <dd className="tabular-nums">−{formatMoney(cart.discount_total)}</dd>
                                </div>
                            )}
                        </dl>
                        <p className="text-xs text-muted">{t('Frais de livraison calculés selon votre ville avant validation.')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ButtonLink to="/panier" variant="secondary" onClick={ui.close}>
                                {t('Panier')}
                            </ButtonLink>
                            <ButtonLink to="/commande" onClick={ui.close} aria-disabled={!cart.is_checkout_ready || undefined}>
                                {t('Commander')}
                            </ButtonLink>
                        </div>
                    </div>
                ) : undefined
            }
        >
            {/* The last line slides out and the list fades before the empty state arrives. */}
            <AnimatePresence mode="wait" initial={false}>
                {loading && !cart ? (
                    <div key="loading" className="flex justify-center py-20 text-muted">
                        <Spinner className="size-6" />
                    </div>
                ) : empty ? (
                    <motion.div
                        key="empty"
                        className="flex flex-col items-center gap-5 px-6 py-20 text-center"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: EASE_LUXE }}
                    >
                        <ShoppingBag className="size-8 text-faint" strokeWidth={1} />
                        <p className="font-display text-2xl">{t('Votre panier est vide')}</p>
                        <p className="max-w-xs text-sm text-muted">{t('Laissez-vous guider par nos signatures, ou composez votre propre coffret.')}</p>
                        <ButtonLink to="/boutique" onClick={ui.close} variant="secondary">
                            {t('Découvrir la boutique')}
                        </ButtonLink>
                    </motion.div>
                ) : (
                    <motion.ul key="lines" className="relative divide-y divide-line px-6" exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.1 } }}>
                        <AnimatePresence mode="popLayout">
                            {cart.lines.map((line, index) => (
                                <CartLineItem key={line.id} line={line} maxQuantity={cart.max_quantity} index={index} compact />
                            ))}
                        </AnimatePresence>
                    </motion.ul>
                )}
            </AnimatePresence>
        </Drawer>
    );
}
