import { useRef } from 'react';
import { motion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion';
import type { HomePayload } from '@shared/types';
import { ButtonLink } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { NotesPyramid, hasNotes } from '../../components/product/NotesPyramid';
import { auraStyle } from '../../components/product/ProductCard';
import { Reveal } from '../../motion/Reveal';
import { ChapterHeader } from './ChapterHeader';
import { t } from '../../i18n';

export function Story({ index, story }: { index: string; story: NonNullable<HomePayload['story']> }) {
    const reduced = useReducedMotionConfig();
    const frame = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], ['-7%', '7%']);
    // The frame opens from a narrower window as it rises into view, then stays open.
    const { scrollYProgress: entry } = useScroll({ target: frame, offset: ['start end', 'start 0.3'] });
    const clipPath = useTransform(entry, [0, 1], ['inset(12% 14% 12% 14% round 1.5rem)', 'inset(0% 0% 0% 0% round 1.5rem)']);
    const scale = useTransform(entry, [0, 1], [1.2, 1]);
    const { product } = story;
    const image = product.images[1] ?? product.images[0] ?? product.image;

    return (
        <section className="container-page grid grid-cols-1 items-center gap-14 py-24 sm:py-32 lg:grid-cols-12 lg:gap-0" aria-labelledby="story-title">
            <motion.div ref={frame} className="aura relative aspect-[4/5] overflow-hidden lg:col-span-6" style={reduced ? auraStyle(product.accent_color) : { ...auraStyle(product.accent_color), clipPath }}>
                <motion.div className="absolute inset-[-8%]" style={reduced ? undefined : { y, scale }}>
                    <ProductImage image={image} alt={product.name} sizes="(min-width: 64rem) 45vw, 100vw" className="absolute inset-0 size-full p-[14%]" />
                </motion.div>
            </motion.div>

            <div className="flex flex-col gap-10 lg:col-span-5 lg:col-start-8">
                <ChapterHeader index={index} label={story.eyebrow ?? t('Le récit')} title={story.title} id="story-title" meta={product.concentration} />
                {story.body && (
                    <Reveal delay={0.1}>
                        <blockquote className="relative max-w-xl font-display text-2xl leading-snug text-muted italic sm:text-[1.8rem]">
                            <span aria-hidden="true" className="absolute -start-1 -top-6 font-display text-7xl leading-none text-accent not-italic opacity-60 sm:-start-8">
                                “
                            </span>
                            {story.body}
                        </blockquote>
                    </Reveal>
                )}
                {hasNotes(product.notes) && (
                    <Reveal delay={0.2}>
                        <NotesPyramid notes={product.notes} compact className="border-t border-line pt-8" />
                    </Reveal>
                )}
                <Reveal delay={0.25}>
                    <ButtonLink to={`/parfums/${product.slug}`} variant="secondary">
                        {t('Découvrir {name}', { name: product.name })}
                    </ButtonLink>
                </Reveal>
            </div>
        </section>
    );
}
