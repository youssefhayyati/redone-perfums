import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Cart } from '@shared/types';
import { ApiError } from '@shared/http';
import { formatMoney } from '@shared/money';
import { cartActions } from '../../stores/cart';
import { toast } from '../../stores/ui';
import { Button } from '../ui/Button';

export function CouponForm({ cart }: { cart: Cart }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function apply(event: FormEvent) {
        event.preventDefault();
        if (!code.trim()) {
            return;
        }

        setPending(true);
        setError(null);
        try {
            await cartActions.applyCoupon(code.trim());
            setCode('');
        } catch (failure) {
            setError(failure instanceof ApiError ? (failure.field('code') ?? failure.message) : 'Ce code n’a pas pu être appliqué.');
        } finally {
            setPending(false);
        }
    }

    async function remove() {
        try {
            await cartActions.removeCoupon();
        } catch (failure) {
            toast.error(failure instanceof ApiError ? failure.message : 'Le code n’a pas pu être retiré.');
        }
    }

    if (cart.coupon) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 border border-dashed border-line-strong px-4 py-3">
                    <p className="text-sm">
                        <span className="font-medium tracking-[0.12em] uppercase">{cart.coupon.code}</span>
                        {cart.coupon.discount > 0 && <span className="ml-2 text-success">−{formatMoney(cart.coupon.discount)}</span>}
                    </p>
                    <button type="button" onClick={remove} className="-m-1 p-1 text-muted hover:text-ink" aria-label={`Retirer le code ${cart.coupon.code}`}>
                        <X className="size-4" strokeWidth={1.5} />
                    </button>
                </div>
                {cart.coupon.error && (
                    <p role="alert" className="text-xs text-warning">
                        {cart.coupon.error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={apply} className="flex flex-col gap-2" noValidate>
            <label htmlFor="coupon-code" className="eyebrow">
                Code promotionnel
            </label>
            <div className="flex gap-2">
                <input
                    id="coupon-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    className="field-control min-h-11 flex-1 py-2 uppercase"
                    autoComplete="off"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'coupon-error' : undefined}
                />
                <Button type="submit" variant="secondary" size="sm" className="h-11" loading={pending} disabled={!code.trim()}>
                    Appliquer
                </Button>
            </div>
            {error && (
                <p id="coupon-error" role="alert" className="text-xs text-danger">
                    {error}
                </p>
            )}
        </form>
    );
}
