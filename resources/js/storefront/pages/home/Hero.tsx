import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { HomePayload, Product, ProductCard } from '@shared/types';
import { ButtonLink } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { auraStyle } from '../../components/product/ProductCard';
import { useConfig } from '../../config';
import { EASE_LUXE } from '../../motion/easing';
import { LightSweep } from '../../motion/LightSweep';

const line = {
    hidden: { y: '108%' },
    show: { y: '0%', transition: { duration: 1.1, ease: EASE_LUXE } },
};

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const words = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
};

const fade = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_LUXE } },
};

/** Splits the title into masked words; the last word is set in italic. */
function Title({ text, id }: { text: string; id: string }) {
    const parts = text.split(/\s+/).filter(Boolean);

    return (
        <motion.h1 id={id} variants={words} className="font-display text-display-xl font-normal text-balance" aria-label={text}>
            {parts.map((word, index) => (
                <span key={`${word}-${index}`} aria-hidden="true" className="inline-block overflow-hidden pr-[0.24em] pb-[0.12em] align-bottom">
                    <motion.span variants={line} className={index === parts.length - 1 && parts.length > 2 ? 'inline-block text-accent italic' : 'inline-block'}>
                        {word}
                    </motion.span>
                </span>
            ))}
        </motion.h1>
    );
}

export function Hero({ hero, product }: { hero: HomePayload['hero'] | undefined; product: Product | ProductCard | undefined }) {
    const { has_packs: hasPacks } = useConfig();
    const section = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });
    const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
    const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
    const image = product?.image ?? null;

    return (
        <section ref={section} className="grain relative -mt-16 flex min-h-[100svh] items-center overflow-hidden sm:-mt-[4.5rem]" aria-labelledby="hero-title">
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10"
                style={{
                    background: `radial-gradient(60% 55% at 72% 58%, color-mix(in oklab, ${product?.accent_color ?? 'var(--color-accent)'} 30%, transparent), transparent 70%), radial-gradient(40% 40% at 10% 90%, color-mix(in oklab, var(--color-accent) 10%, transparent), transparent 70%)`,
                }}
            />

            <div className="container-page grid grid-cols-1 w-full items-center gap-6 pt-28 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-32">
                {hero && (
                    <motion.div className="relative z-10 flex flex-col gap-8" style={{ y: textY }} variants={container} initial="hidden" animate="show">
                        {hero.eyebrow && (
                            <motion.p variants={fade} className="eyebrow">
                                {hero.eyebrow}
                            </motion.p>
                        )}
                        <Title id="hero-title" text={hero.title ?? ''} />
                        {hero.subtitle && (
                            <motion.p variants={fade} className="max-w-lg text-lg leading-relaxed text-muted">
                                {hero.subtitle}
                            </motion.p>
                        )}
                        <motion.div variants={fade} className="flex flex-wrap gap-3 pt-2">
                            <ButtonLink to="/boutique" size="lg">
                                Découvrir la boutique
                            </ButtonLink>
                            {hasPacks && (
                                <ButtonLink to="/coffrets" size="lg" variant="secondary">
                                    Composer un coffret
                                </ButtonLink>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                <motion.div
                    className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] lg:max-h-[78svh]"
                    style={{ y: imageY }}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: product ? 1 : 0, scale: product ? 1 : 0.94 }}
                    transition={{ duration: 1.6, ease: EASE_LUXE, delay: 0.25 }}
                >
                    <span aria-hidden="true" className="absolute inset-[8%] rounded-t-full border border-line" />
                    <div className="aura absolute inset-[8%] overflow-hidden rounded-t-full bg-transparent" style={auraStyle(product?.accent_color)}>
                        <motion.div className="absolute inset-0" animate={{ y: [0, -14, 0] }} transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}>
                            <ProductImage image={image} alt={product?.name ?? ''} priority sizes="(min-width: 64rem) 40vw, 90vw" className="absolute inset-0 size-full scale-110 object-contain pt-[4%]" />
                        </motion.div>
                        <LightSweep delay={1.8} repeatDelay={7} />
                    </div>
                </motion.div>
            </div>

            <motion.div
                aria-hidden="true"
                className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-2xs tracking-[0.3em] text-faint uppercase sm:flex"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 1 }}
            >
                Défiler
                <span className="relative h-10 w-px overflow-hidden bg-line">
                    <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-accent" animate={{ y: ['-100%', '200%'] }} transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }} />
                </span>
            </motion.div>
        </section>
    );
}
