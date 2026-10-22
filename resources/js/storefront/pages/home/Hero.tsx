import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion';
import { isRtl } from '@shared/locale';
import type { HomePayload, Product, ProductCard } from '@shared/types';
import { ButtonLink } from '../../components/ui/Button';
import { Price } from '../../components/ui/Price';
import { ProductImage } from '../../components/ui/ProductImage';
import { auraStyle } from '../../components/product/ProductCard';
import { useConfig } from '../../config';
import { EASE_LUXE, stagger } from '../../motion/easing';
import { RevealWords } from '../../motion/Reveal';
import { t } from '../../i18n';

const fade = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_LUXE } },
};

/** Small card in the corner of the stage: the perfume on show, one tap from its page. */
function FeaturedPerfume({ product }: { product: Product | ProductCard }) {
    return (
        <Link
            to={`/parfums/${product.slug}`}
            className="group flex w-full max-w-sm items-center gap-4 rounded-2xl border border-line bg-canvas/45 p-2.5 pe-4 text-start backdrop-blur-md transition-colors duration-500 ease-luxe hover:border-accent sm:w-auto"
        >
            <span className="aura relative size-16 shrink-0 overflow-hidden rounded-xl" style={auraStyle(product.accent_color)}>
                <ProductImage image={product.image} alt="" sizes="64px" className="absolute inset-0 size-full p-1" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-2xs tracking-label text-muted uppercase">{product.concentration ?? t('La signature')}</span>
                <span className="truncate font-display text-xl leading-tight">{product.name}</span>
                <Price amount={product.price_from} from={product.has_price_range} className="text-xs" />
            </span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line transition-colors duration-500 ease-luxe group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">
                <ArrowUpRight className="size-4 transition-transform duration-500 ease-spring group-hover:rotate-45 rtl:-scale-x-100" strokeWidth={1.5} />
            </span>
        </Link>
    );
}

/**
 * The homepage stage: a rounded panel with the title at the top, the perfume rising
 * from the bottom into a halo, and the actions and featured perfume in the corners.
 */
export function Hero({ hero, product }: { hero: HomePayload['hero'] | undefined; product: Product | ProductCard | undefined }) {
    const { has_packs: hasPacks } = useConfig();
    const reduced = useReducedMotionConfig();
    const stage = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: stage, offset: ['start start', 'end start'] });
    const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
    const bottleY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
    const haloScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
    const accent = product?.accent_color ?? 'var(--color-accent)';

    return (
        <section className="px-3 pb-3 sm:px-4 sm:pb-4" aria-labelledby="hero-title">
            <div
                ref={stage}
                className="grain relative flex flex-col overflow-hidden rounded-[1.75rem] bg-raised sm:rounded-[2.25rem] lg:h-[calc(100svh-7.5rem)] lg:min-h-[38rem] lg:max-h-[60rem]"
            >
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10"
                    style={{
                        background: `radial-gradient(55% 65% at ${isRtl() ? 30 : 70}% 80%, color-mix(in oklab, ${accent} 26%, transparent), transparent 75%), radial-gradient(35% 40% at 0% 0%, color-mix(in oklab, var(--color-accent) 8%, transparent), transparent 70%)`,
                    }}
                />

                {hero && (
                    <motion.div
                        className="relative z-20 flex flex-col items-start gap-6 px-5 pt-9 sm:px-10 lg:max-w-[50%] lg:pt-14"
                        style={reduced ? undefined : { y: titleY }}
                        variants={stagger(0.08, 0.15)}
                        initial="hidden"
                        animate="show"
                    >
                        {hero.eyebrow && (
                            <motion.p variants={fade} className="eyebrow flex items-center gap-4">
                                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                                {hero.eyebrow}
                            </motion.p>
                        )}
                        <RevealWords
                            as="h1"
                            id="hero-title"
                            trigger="parent"
                            accentLast
                            text={hero.title ?? ''}
                            className="max-w-[13ch] font-display text-display-xl font-normal text-balance lg:text-[clamp(4rem,5.4vw,5.5rem)]"
                        />
                    </motion.div>
                )}

                {/* The stage: the perfume in a halo, below the title on small screens and on the right on large ones. */}
                <div aria-hidden="true" className="relative h-[22rem] sm:h-[28rem] lg:absolute lg:start-[42%] lg:end-[3%] lg:top-[5%] lg:bottom-0 lg:h-auto">
                    <motion.span
                        className="absolute bottom-[-30%] left-1/2 aspect-square w-[min(88vw,40rem)] -translate-x-1/2 rounded-full border border-line lg:top-1/2 lg:bottom-auto lg:w-[min(42vw,38rem)] lg:-translate-y-1/2"
                        style={{ scale: reduced ? 1 : haloScale, background: `radial-gradient(closest-side, color-mix(in oklab, ${accent} 34%, transparent), color-mix(in oklab, ${accent} 8%, transparent) 70%, transparent)` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: product ? 1 : 0 }}
                        transition={{ duration: 1.6, ease: EASE_LUXE, delay: 0.2 }}
                    />
                    <motion.span
                        className="absolute bottom-[-42%] left-1/2 aspect-square w-[min(118vw,54rem)] -translate-x-1/2 rounded-full border border-line opacity-60 lg:top-1/2 lg:bottom-auto lg:w-[min(56vw,50rem)] lg:-translate-y-1/2"
                        style={{ scale: reduced ? 1 : haloScale }}
                    />
                    <motion.div
                        className="absolute inset-0"
                        style={reduced ? undefined : { y: bottleY }}
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: product ? 1 : 0, y: product ? 0 : 80 }}
                        transition={{ duration: 1.5, ease: EASE_LUXE, delay: 0.35 }}
                    >
                        <motion.div className="absolute inset-0" animate={{ y: [0, -12, 0] }} transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}>
                            <ProductImage image={product?.image} alt="" priority sizes="(min-width: 64rem) 34vw, 80vw" className="absolute inset-0 size-full object-bottom" />
                        </motion.div>
                    </motion.div>
                </div>

                {hero && (
                    <motion.div
                        className="relative z-10 mt-auto grid grid-cols-1 items-end gap-8 p-5 pb-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-6"
                        variants={stagger(0.1, 0.9)}
                        initial="hidden"
                        animate="show"
                    >
                        <motion.div variants={fade} className="flex flex-col items-start gap-6">
                            {hero.subtitle && <p className="max-w-sm leading-relaxed text-muted">{hero.subtitle}</p>}
                            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
                                <ButtonLink to="/boutique" size="lg">
                                    {t('Découvrir la boutique')}
                                </ButtonLink>
                                {hasPacks && (
                                    <Link to="/coffrets" className="link-draw inline-flex items-center gap-2 text-2xs font-medium tracking-[0.2em] uppercase">
                                        {t('Composer un coffret')} <ArrowRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} />
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                        {product && (
                            <motion.div variants={fade} className="flex lg:justify-end">
                                <FeaturedPerfume product={product} />
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>
        </section>
    );
}
