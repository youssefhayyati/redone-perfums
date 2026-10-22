import { Link } from 'react-router';
import { motion } from 'framer-motion';
import type { Pack, ProductCard } from '@shared/types';
import { formatMoney } from '@shared/money';
import { plural } from '@shared/format';
import { ButtonLink } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { EASE_LUXE } from '../../motion/easing';
import { Reveal } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';

const slots = {
    hidden: {},
    show: { transition: { staggerChildren: 0.35, delayChildren: 0.3 } },
};

const bottle = {
    hidden: { opacity: 0, y: -36, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE_LUXE } },
};

/** Three empty slots that fill one by one when scrolled into view. */
function Composition({ products }: { products: ProductCard[] }) {
    return (
        <motion.div className="flex items-end justify-center gap-4 sm:gap-6 lg:col-span-5 lg:col-start-8" variants={slots} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -15% 0px' }}>
            {products.slice(0, 3).map((product, index) => (
                <div key={product.id} className="flex flex-col items-center gap-3">
                    <div className={`relative flex aspect-[3/4] w-24 items-end justify-center rounded-2xl border border-dashed border-line-strong ${index === 1 ? 'sm:w-36 lg:w-44' : 'sm:w-32 lg:w-36'}`}>
                        <motion.div variants={bottle} className="absolute inset-0">
                            <ProductImage image={product.image} alt="" sizes="144px" className="size-full p-2" />
                        </motion.div>
                    </div>
                    <span className="text-2xs tracking-[0.18em] text-muted uppercase tabular-nums">0{index + 1}</span>
                </div>
            ))}
        </motion.div>
    );
}

export function PacksTeaser({ index, packs, products }: { index: string; packs: Pack[]; products: ProductCard[] }) {
    return (
        <section className="grain border-y border-line bg-raised" aria-labelledby="packs-title">
            <div className="container-page grid grid-cols-1 items-center gap-16 py-24 sm:py-32 lg:grid-cols-12 lg:gap-0">
                <div className="flex flex-col gap-8 lg:col-span-6">
                    <ChapterHeader index={index} label="Coffrets" title="Composez votre propre coffret." id="packs-title" />
                    <Reveal delay={0.1}>
                        <p className="max-w-md text-muted">Réunissez vos parfums préférés dans un écrin, à un prix plus doux que l’achat séparé. Le prix final s’affiche dès que votre sélection est complète.</p>
                    </Reveal>
                    <ul className="flex flex-col divide-y divide-line border-y border-line">
                        {packs.map((pack) => (
                            <li key={pack.id}>
                                <Link to={`/coffrets/${pack.slug}`} className="group flex items-baseline justify-between gap-6 py-5">
                                    <span className="flex flex-col gap-1">
                                        <span className="font-display text-2xl transition-[color,translate] duration-500 ease-luxe group-hover:translate-x-2 group-hover:text-accent">{pack.name}</span>
                                        <span className="text-xs text-muted">
                                            {plural(pack.bottle_count, 'flacon')} · {pack.pricing.label}
                                        </span>
                                    </span>
                                    {pack.starting_price !== null && (
                                        <span className="text-sm whitespace-nowrap tabular-nums">
                                            {pack.type === 'custom' && pack.pricing.type !== 'fixed' ? 'dès ' : ''}
                                            {formatMoney(pack.starting_price)}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <ButtonLink to="/coffrets" variant="secondary" className="self-start">
                        Tous les coffrets
                    </ButtonLink>
                </div>
                <Composition products={products} />
            </div>
        </section>
    );
}
