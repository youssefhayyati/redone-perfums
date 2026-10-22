import type { Variant } from '@shared/types';
import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';

interface VariantPickerProps {
    variants: Variant[];
    value: number | null;
    onChange: (variantId: number) => void;
    name?: string;
}

export function VariantPicker({ variants, value, onChange, name = 'variant' }: VariantPickerProps) {
    return (
        <fieldset className="flex flex-col gap-3">
            <legend className="eyebrow mb-3">Contenance</legend>
            <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                    const selected = variant.id === value;
                    const soldOut = variant.availability === 'out_of_stock';

                    return (
                        <label
                            key={variant.id}
                            className={cn(
                                'relative flex min-w-[6.5rem] flex-col items-center gap-0.5 rounded-control border px-4 py-3 text-center transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                                selected ? 'border-ink bg-ink/4' : 'border-line-strong hover:border-ink/60',
                                soldOut && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={variant.id}
                                checked={selected}
                                disabled={soldOut}
                                onChange={() => onChange(variant.id)}
                                className="sr-only"
                            />
                            <span className="text-sm text-ink">{variant.label}</span>
                            <span className={cn('text-xs tabular-nums', soldOut ? 'text-muted line-through' : 'text-muted')}>{formatMoney(variant.price)}</span>
                            {soldOut && <span className="text-2xs tracking-[0.14em] text-muted uppercase">Épuisé</span>}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
