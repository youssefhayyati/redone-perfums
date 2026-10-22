import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { PackOption, Variant } from '@shared/types';
import { formatMoney } from '@shared/money';
import { cn } from '@shared/format';
import { EASE_LUXE } from '../../motion/easing';
import { ProductImage } from '../ui/ProductImage';

export interface SlotItem {
    key: number;
    option: PackOption;
    variant: Variant;
}

interface PackSlotsProps {
    count: number;
    items: SlotItem[];
    onRemove: (key: number) => void;
    compact?: boolean;
}

/** Numbered slots that fill in order; each new bottle settles into place. */
export function PackSlots({ count, items, onRemove, compact = false }: PackSlotsProps) {
    return (
        <ol className={cn('grid gap-3', compact ? 'grid-flow-col auto-cols-[minmax(4.5rem,1fr)] overflow-x-auto no-scrollbar' : count > 4 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-3')} aria-label="Votre sélection">
            {Array.from({ length: count }, (_, index) => {
                const item = items[index];

                return (
                    <li key={index} className={cn('relative flex flex-col gap-2', compact && 'min-w-[4.5rem]')}>
                        <div className={cn('relative aspect-[3/4] overflow-hidden rounded-2xl border transition-colors duration-500', item ? 'aura border-line' : 'border-dashed border-line-strong')}>
                            <span className="absolute top-2 left-2 z-10 text-2xs text-faint tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                            <AnimatePresence mode="popLayout">
                                {item ? (
                                    <motion.div
                                        key={item.key}
                                        className="absolute inset-0"
                                        initial={{ opacity: 0, y: -28, scale: 0.86 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.7, ease: EASE_LUXE }}
                                    >
                                        <ProductImage image={item.option.image} alt="" sizes="160px" className="size-full p-2" />
                                        <button
                                            type="button"
                                            onClick={() => onRemove(item.key)}
                                            className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center bg-canvas/80 text-muted backdrop-blur-sm transition-colors hover:text-ink"
                                            aria-label={`Retirer ${item.option.name} ${item.variant.label}`}
                                        >
                                            <X className="size-3.5" strokeWidth={1.5} />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.span key="empty" className="absolute inset-0 flex items-center justify-center text-xs text-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        À choisir
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                        {!compact && (
                            <div className="min-h-10 text-xs leading-snug">
                                {item ? (
                                    <>
                                        <p className="truncate text-ink">{item.option.name}</p>
                                        <p className="text-muted tabular-nums">
                                            {item.variant.label} · {formatMoney(item.variant.price)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-faint">Flacon {index + 1}</p>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
