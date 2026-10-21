import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { HomePayload } from '@shared/types';
import { ButtonLink } from '../../components/ui/Button';
import { ProductImage } from '../../components/ui/ProductImage';
import { NotesPyramid, hasNotes } from '../../components/product/NotesPyramid';
import { auraStyle } from '../../components/product/ProductCard';
import { Reveal } from '../../motion/Reveal';

export function Story({ story }: { story: NonNullable<HomePayload['story']> }) {
    const frame = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], ['-7%', '7%']);
    const { product } = story;
    const image = product.images[1] ?? product.images[0] ?? product.image;

    return (
        <section className="container-page grid grid-cols-1 items-center gap-12 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24" aria-labelledby="story-title">
            <div ref={frame} className="aura relative aspect-[4/5] overflow-hidden" style={auraStyle(product.accent_color)}>
                <motion.div className="absolute inset-[-8%]" style={{ y }}>
                    <ProductImage image={image} alt={product.name} sizes="(min-width: 64rem) 45vw, 100vw" className="absolute inset-0 size-full p-[14%]" />
                </motion.div>
            </div>

            <div className="flex flex-col gap-8">
                <Reveal className="flex flex-col gap-5">
                    {story.eyebrow && <p className="eyebrow">{story.eyebrow}</p>}
                    <h2 id="story-title" className="font-display text-display-lg text-balance">
                        {story.title}
                    </h2>
                </Reveal>
                {story.body && (
                    <Reveal delay={0.1}>
                        <p className="max-w-xl font-display text-2xl leading-snug text-muted italic sm:text-[1.7rem]">{story.body}</p>
                    </Reveal>
                )}
                {hasNotes(product.notes) && (
                    <Reveal delay={0.2}>
                        <NotesPyramid notes={product.notes} compact className="border-t border-line pt-8" />
                    </Reveal>
                )}
                <Reveal delay={0.25}>
                    <ButtonLink to={`/parfums/${product.slug}`} variant="secondary">
                        Découvrir {product.name}
                    </ButtonLink>
                </Reveal>
            </div>
        </section>
    );
}
