import type { ProductCard as ProductCardData } from '@shared/types';
import { cn } from '@shared/format';
import { RevealGroup, RevealItem } from '../../motion/Reveal';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

const columns = {
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
};

export function ProductGrid({ products, cols = 4, className }: { products: ProductCardData[]; cols?: 3 | 4; className?: string }) {
    return (
        <RevealGroup as="ul" className={cn('grid gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16', columns[cols], className)} step={0.06}>
            {products.map((product, index) => (
                <RevealItem as="li" key={product.id}>
                    <ProductCard product={product} priority={index < 2} />
                </RevealItem>
            ))}
        </RevealGroup>
    );
}

export function ProductGridSkeleton({ count = 8, cols = 4 }: { count?: number; cols?: 3 | 4 }) {
    return (
        <div className={cn('grid gap-x-4 gap-y-12 sm:gap-x-6 sm:gap-y-16', columns[cols])} role="status" aria-label="Chargement des parfums">
            {Array.from({ length: count }, (_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}
