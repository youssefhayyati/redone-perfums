import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { ProductCard as ProductCardData } from '@shared/types';
import { cn } from '@shared/format';
import { ProductCard } from '../../components/product/ProductCard';
import { ProductGridSkeleton } from '../../components/product/ProductGrid';
import { RevealGroup, RevealItem } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';
import { t, tn } from '../../i18n';

const SHOWN = 4;

/** Featured perfumes on a staggered rhythm: every second card sits lower. */
export function Signatures({ index, products }: { index: string; products: ProductCardData[] | undefined }) {
    const shown = products?.slice(0, SHOWN);

    return (
        <section className="container-page flex flex-col gap-14 py-24 sm:gap-20 sm:py-32" aria-labelledby="featured-title">
            <ChapterHeader
                index={index}
                label={t('La sélection')}
                title={t('Nos signatures')}
                id="featured-title"
                meta={products ? tn(products.length, 'parfum') : null}
                action={
                    <Link to="/boutique" className="link-draw inline-flex items-center gap-2 text-2xs font-medium tracking-[0.2em] uppercase">
                        {t('Toute la boutique')} <ArrowRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} />
                    </Link>
                }
            />

            {shown ? (
                <RevealGroup as="ul" className="grid grid-cols-2 gap-x-4 gap-y-14 pb-14 sm:gap-x-6 sm:pb-24 lg:grid-cols-4" step={0.08}>
                    {shown.map((product, position) => (
                        <RevealItem as="li" key={product.id}>
                            <div className={cn('flex flex-col gap-4', position % 2 === 1 && 'translate-y-14 sm:translate-y-24')}>
                                <span className="flex items-center gap-3 text-2xs tracking-label text-faint tabular-nums">
                                    {String(position + 1).padStart(2, '0')}
                                    <span aria-hidden="true" className="h-px flex-1 bg-line" />
                                </span>
                                <ProductCard product={product} priority={position < 2} />
                            </div>
                        </RevealItem>
                    ))}
                </RevealGroup>
            ) : (
                <ProductGridSkeleton count={SHOWN} />
            )}
        </section>
    );
}
