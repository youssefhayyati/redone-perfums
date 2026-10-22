import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';
import { t } from '../../i18n';

interface PriceProps {
    amount: number | null;
    compareAt?: number | null;
    from?: boolean;
    className?: string;
}

/** A price with its struck-through reference price when discounted. */
export function Price({ amount, compareAt, from = false, className }: PriceProps) {
    if (amount === null) {
        return null;
    }

    const discounted = compareAt !== null && compareAt !== undefined && compareAt > amount;

    return (
        <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 tabular-nums', className)}>
            {from && <span className="text-muted">{t('À partir de')}</span>}
            <span>{formatMoney(amount)}</span>
            {discounted && (
                <s className="text-[0.85em] text-muted decoration-1">
                    <span className="sr-only">{t('au lieu de ')}</span>
                    {formatMoney(compareAt)}
                </s>
            )}
        </span>
    );
}
