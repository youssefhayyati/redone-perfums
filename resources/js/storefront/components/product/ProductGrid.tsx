import { AnimatePresence, motion, useReducedMotionConfig } from 'framer-motion';
import type { ProductCard as ProductCardData } from '@shared/types';
import { cn } from '@shared/format';
import { EASE_LUXE } from '../../motion/easing';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { t } from '../../i18n';

const columns = {
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
};

const viewport = { once: true, margin: '0px 0px -8% 0px' } as const;

/**
 * Cards rise in as each row reaches the viewport, one after another along the row. When
 * the list changes (filters), cards that stay glide to their new place, new ones rise
 * in and removed ones fade out.
 */
export function ProductGrid({ products, cols = 4, className }: { products: ProductCardData[]; cols?: 3 | 4; className?: string }) {
    const reduced = useReducedMotionConfig();

    return (
        <ul className={cn('relative grid gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16', columns[cols], className)}>
            <AnimatePresence mode="popLayout">
                {products.map((product, index) => (
                    <motion.li
                        key={product.id}
                        layout={!reduced}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3, ease: 'easeOut' } }}
                        viewport={viewport}
                        transition={{ duration: 0.9, ease: EASE_LUXE, delay: (index % cols) * 0.08, layout: { duration: 0.7, ease: EASE_LUXE } }}
                    >
                        <ProductCard product={product} priority={index < 2} />
                    </motion.li>
                ))}
            </AnimatePresence>
        </ul>
    );
}

export function ProductGridSkeleton({ count = 8, cols = 4 }: { count?: number; cols?: 3 | 4 }) {
    return (
        <div className={cn('grid gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16', columns[cols])} role="status" aria-label={t('Chargement des parfums')}>
            {Array.from({ length: count }, (_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}
