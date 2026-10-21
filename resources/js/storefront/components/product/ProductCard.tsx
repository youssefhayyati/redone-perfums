import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { ProductBadge, ProductCard as ProductCardData } from '@shared/types';
import { cn } from '@shared/format';
import { Badge } from '../ui/States';
import { Price } from '../ui/Price';
import { ProductImage } from '../ui/ProductImage';

export const BADGE_LABELS: Record<ProductBadge, string> = {
    new: 'Nouveau',
    bestseller: 'Best-seller',
    limited: 'Édition limitée',
};

export function auraStyle(color: string | null | undefined): CSSProperties | undefined {
    return color ? ({ '--aura': color } as CSSProperties) : undefined;
}

interface ProductCardProps {
    product: ProductCardData;
    priority?: boolean;
    sizes?: string;
    className?: string;
}

export function ProductCard({ product, priority = false, sizes = '(min-width: 80rem) 22vw, (min-width: 48rem) 30vw, 46vw', className }: ProductCardProps) {
    const href = `/parfums/${product.slug}`;
    const discounted = product.variants.find((variant) => variant.price === product.price_from)?.compare_at_price ?? null;

    return (
        <article className={cn('group relative flex flex-col gap-4', className)}>
            <Link to={href} tabIndex={-1} aria-hidden="true" className="aura relative block aspect-[4/5] overflow-hidden" style={auraStyle(product.accent_color)}>
                <ProductImage
                    image={product.image}
                    alt=""
                    sizes={sizes}
                    priority={priority}
                    className={cn(
                        'absolute inset-0 size-full p-[4%] transition-[opacity,transform] duration-[900ms] ease-luxe group-hover:scale-[1.035]',
                        product.hover_image && 'group-hover:opacity-0',
                    )}
                />
                {product.hover_image && (
                    <ProductImage
                        image={product.hover_image}
                        alt=""
                        sizes={sizes}
                        className="absolute inset-0 size-full scale-[1.02] p-[4%] opacity-0 transition-[opacity,transform] duration-[900ms] ease-luxe group-hover:scale-100 group-hover:opacity-100"
                    />
                )}
                <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                    {product.badge && <Badge>{BADGE_LABELS[product.badge]}</Badge>}
                    {!product.in_stock && <Badge className="text-muted">Épuisé</Badge>}
                </div>
            </Link>

            <div className="flex flex-col gap-1.5">
                {product.family && <p className="eyebrow">{product.family.name}</p>}
                <h3 className="font-display text-[1.65rem] leading-[1.1]">
                    <Link to={href} className="transition-colors duration-300 hover:text-accent">
                        {product.name}
                    </Link>
                </h3>
                {product.excerpt && <p className="line-clamp-1 text-sm text-muted">{product.excerpt}</p>}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-1 text-sm">
                    <Price amount={product.price_from} compareAt={discounted} from={product.has_price_range} />
                    {product.variants.length > 0 && (
                        <span className="text-2xs tracking-[0.12em] text-faint uppercase">{product.variants.map((variant) => variant.size_ml).join(' · ')} ml</span>
                    )}
                </div>
            </div>
        </article>
    );
}

export function ProductCardSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-hidden="true">
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
        </div>
    );
}
