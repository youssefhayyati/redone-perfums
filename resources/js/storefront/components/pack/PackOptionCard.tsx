import type { PackOption, Variant } from '@shared/types';
import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';
import { ProductImage } from '../ui/ProductImage';
import { auraStyle } from '../product/ProductCard';

interface PackOptionCardProps {
    option: PackOption;
    /** Variant ids of this product already in the selection. */
    chosen: number[];
    full: boolean;
    allowDuplicates: boolean;
    onPick: (variant: Variant) => void;
}

export function PackOptionCard({ option, chosen, full, allowDuplicates, onPick }: PackOptionCardProps) {
    const taken = !allowDuplicates && chosen.length > 0;
    const notes = option.notes ? [...option.notes.top, ...option.notes.heart, ...option.notes.base].slice(0, 4) : [];

    return (
        <article className={cn('flex flex-col gap-4', taken && 'opacity-60')}>
            <div className="aura relative aspect-[4/5] overflow-hidden" style={auraStyle(option.accent_color)}>
                <ProductImage image={option.image} alt="" sizes="(min-width: 64rem) 18vw, 45vw" className="absolute inset-0 size-full p-[5%]" />
                {chosen.length > 0 && (
                    <span className="absolute top-3 left-3 bg-accent px-2 py-1 text-2xs tracking-[0.16em] text-on-accent uppercase">{allowDuplicates && chosen.length > 1 ? `Choisi ×${chosen.length}` : 'Choisi'}</span>
                )}
            </div>
            <div className="flex flex-col gap-1">
                {option.family && <p className="eyebrow">{option.family.name}</p>}
                <h3 className="font-display text-2xl leading-tight">{option.name}</h3>
                {notes.length > 0 && <p className="line-clamp-1 text-xs text-muted">{notes.join(' · ')}</p>}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Ajouter ${option.name}`}>
                {option.pack_variants.map((variant) => {
                    const soldOut = variant.availability === 'out_of_stock';
                    const disabled = soldOut || full || taken;

                    return (
                        <button
                            key={variant.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onPick(variant)}
                            className="flex min-h-10 items-center gap-2 border border-line-strong px-3 text-xs transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:text-inherit"
                            aria-label={`Ajouter ${option.name} ${variant.label} à la sélection${soldOut ? ' (épuisé)' : ''}`}
                        >
                            <span>+ {variant.label}</span>
                            <span className="text-muted tabular-nums">{soldOut ? 'Épuisé' : formatMoney(variant.price)}</span>
                        </button>
                    );
                })}
            </div>
        </article>
    );
}
