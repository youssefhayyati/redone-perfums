import { useState } from 'react';
import { Link } from 'react-router';
import { TriangleAlert, X } from 'lucide-react';
import type { CartLine } from '@shared/types';
import { ApiError } from '@shared/http';
import { cn } from '@shared/format';
import { cartActions } from '../../stores/cart';
import { toast } from '../../stores/ui';
import { Price } from '../ui/Price';
import { ProductImage } from '../ui/ProductImage';
import { QuantityStepper } from '../ui/QuantityStepper';
import { t, tn } from '../../i18n';

interface CartLineItemProps {
    line: CartLine;
    maxQuantity: number;
    compact?: boolean;
}

function lineLink(line: CartLine): string | null {
    if (line.type === 'product') {
        return line.product ? `/parfums/${line.product.slug}` : null;
    }

    return line.pack ? `/coffrets/${line.pack.slug}` : null;
}

export function CartLineItem({ line, maxQuantity, compact = false }: CartLineItemProps) {
    const [pending, setPending] = useState(false);
    const link = lineLink(line);
    const title = line.type === 'product' ? (line.product?.name ?? t('Article indisponible')) : (line.pack?.name ?? t('Coffret indisponible'));
    const image = line.type === 'product' ? line.product?.image : line.selections[0]?.image;
    const packImage = line.type === 'pack' ? line.pack?.image : null;

    async function run(action: () => Promise<unknown>) {
        setPending(true);
        try {
            await action();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t('La modification n’a pas pu être enregistrée.'));
        } finally {
            setPending(false);
        }
    }

    return (
        <li className={cn('flex gap-4 py-5', pending && 'opacity-60 transition-opacity')}>
            <div className={cn('aura shrink-0 overflow-hidden', compact ? 'h-24 w-20' : 'h-32 w-26 sm:h-36 sm:w-28')}>
                {packImage ? (
                    <img src={packImage} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                    <ProductImage image={image} alt="" sizes="112px" className="size-full p-2" />
                )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {link ? (
                            <Link to={link} className="font-display text-xl leading-tight hover:text-accent">
                                {title}
                            </Link>
                        ) : (
                            <p className="font-display text-xl leading-tight">{title}</p>
                        )}
                        {line.type === 'product' && line.variant && <p className="mt-1 text-xs text-muted">{line.variant.label}</p>}
                        {line.type === 'pack' && (
                            <p className="mt-1 text-xs text-muted">{tn(line.selections.length, 'flacon')}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => run(() => cartActions.remove(line.id))}
                        disabled={pending}
                        className="-m-2 p-2 text-muted transition-colors hover:text-ink"
                        aria-label={t('Retirer {title} du panier', { title })}
                    >
                        <X className="size-4" strokeWidth={1.5} />
                    </button>
                </div>

                {line.type === 'pack' && line.selections.length > 0 && (
                    <ul className="flex flex-col gap-1 border-s border-line ps-3 text-xs text-muted">
                        {line.selections.map((selection, index) => (
                            <li key={`${selection.variant_id}-${index}`}>
                                {selection.product_name} · {t('{sizes} ml', { sizes: selection.size_ml })}
                            </li>
                        ))}
                    </ul>
                )}

                {line.type === 'pack' && line.pack?.editable && (
                    <Link to={`/coffrets/${line.pack.slug}?ligne=${line.id}`} className="link-draw self-start text-xs text-ink">
                        {t('Modifier la composition')}
                    </Link>
                )}

                {line.issues.length > 0 && (
                    <ul className="flex flex-col gap-1">
                        {line.issues.map((issue) => (
                            <li key={issue.code + issue.message} className="flex items-start gap-1.5 text-xs text-warning">
                                <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.5} />
                                {issue.message}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                    <QuantityStepper
                        size="sm"
                        value={line.quantity}
                        max={maxQuantity}
                        disabled={pending || line.unit_price === null}
                        onChange={(quantity) => run(() => cartActions.setQuantity(line.id, quantity))}
                        label={t('Quantité pour {title}', { title })}
                    />
                    {line.unit_price !== null && (
                        <Price
                            amount={line.line_total}
                            compareAt={line.compare_at_price !== null ? line.compare_at_price * line.quantity : null}
                            className="text-sm"
                        />
                    )}
                </div>
            </div>
        </li>
    );
}
