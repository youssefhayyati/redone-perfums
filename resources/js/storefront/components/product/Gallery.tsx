import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'framer-motion';
import type { ImageAsset } from '@shared/types';
import { cn } from '@shared/format';
import { EASE_LUXE } from '../../motion/easing';
import { LightSweep } from '../../motion/LightSweep';
import { ProductImage } from '../ui/ProductImage';
import { auraStyle } from './ProductCard';
import { t } from '../../i18n';

export function Gallery({ images, name, accent }: { images: ImageAsset[]; name: string; accent: string | null }) {
    const [active, setActive] = useState(0);
    const current = images[active] ?? images[0] ?? null;
    const reduced = useReducedMotionConfig();

    return (
        <div className="flex flex-col gap-3">
            {/* Mobile: swipeable strip */}
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto md:hidden" aria-label={t('Images de {name}', { name })}>
                {(images.length > 0 ? images : [null]).map((image, index) => (
                    <div key={image?.id ?? index} className="aura relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden" style={auraStyle(accent)}>
                        <ProductImage image={image} alt={name} priority={index === 0} sizes="100vw" className="absolute inset-0 size-full p-[10%]" />
                        {index === 0 && <LightSweep />}
                    </div>
                ))}
            </div>

            {/* Desktop: a stage that opens on arrival, turns slightly towards the pointer and cross-fades between images. */}
            <motion.div
                data-tilt="soft"
                className="aura relative hidden aspect-[4/5] overflow-hidden md:block"
                style={auraStyle(accent)}
                initial={reduced ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
                animate={{ clipPath: 'inset(0% 0% 0% 0%)', transitionEnd: { clipPath: 'none' } }}
                transition={{ duration: 1.2, ease: EASE_LUXE }}
            >
                <AnimatePresence initial={false}>
                    <motion.div
                        key={current?.id ?? 'placeholder'}
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: EASE_LUXE }}
                    >
                        <ProductImage image={current} alt={name} priority sizes="(min-width: 80rem) 45vw, 50vw" className="absolute inset-0 size-full p-[9%]" />
                    </motion.div>
                </AnimatePresence>
                <LightSweep />
            </motion.div>
            {images.length > 1 && (
                <div className="hidden gap-3 md:flex" role="tablist" aria-label={t('Choisir une image')}>
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            role="tab"
                            aria-selected={index === active}
                            aria-label={t('Image {index} sur {count}', { index: index + 1, count: images.length })}
                            onClick={() => setActive(index)}
                            className={cn('aura size-20 overflow-hidden border transition-colors', index === active ? 'border-ink' : 'border-transparent hover:border-line-strong')}
                            style={auraStyle(accent)}
                        >
                            <ProductImage image={image} alt="" sizes="80px" className="size-full p-2" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
