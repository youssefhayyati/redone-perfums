import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion';
import { cn } from '@shared/format';
import { isRtl } from '@shared/locale';
import { Reveal } from '../../motion/Reveal';
import { t } from '../../i18n';

/** Last word of the page: an oversized line, drifting with the scroll, that leads to the olfactory guide. */
export function Closing() {
    const reduced = useReducedMotionConfig();
    const line = useRef<HTMLHeadingElement>(null);
    const { scrollYProgress } = useScroll({ target: line, offset: ['start end', 'end start'] });
    // The line drifts towards the end of the reading direction.
    const x = useTransform(scrollYProgress, [0, 1], isRtl() ? ['-6%', '28%'] : ['6%', '-28%']);

    return (
        <section className="overflow-hidden pt-24 sm:pt-32" aria-labelledby="closing-title">
            <Reveal className="container-page flex flex-wrap items-end justify-between gap-6">
                <p className="eyebrow">{t('Guide olfactif')}</p>
                <p className="max-w-sm text-muted">{t('Ambré, boisé, floral… Les parfums se rangent en familles. Commencez par celle qui vous attire.')}</p>
            </Reveal>
            <h2 ref={line} id="closing-title" className="mt-10 border-y border-line">
                <Link to="/decouvrir" className="group block py-6 transition-colors duration-500 ease-luxe hover:bg-raised sm:py-10">
                    <motion.span
                        className={cn(
                            'flex items-center gap-[0.25em] font-display font-normal',
                            reduced ? 'container-page flex-wrap text-display-xl' : 'w-max ps-[6vw] text-display-2xl whitespace-nowrap',
                        )}
                        style={reduced ? undefined : { x }}
                    >
                        <span>
                            {t('Trouvez')} <em className="text-accent">{t('votre parfum')}</em>
                        </span>
                        <ArrowRight className="size-[0.6em] shrink-0 transition-transform duration-500 ease-luxe group-hover:translate-x-4 rtl:-scale-x-100 rtl:group-hover:-translate-x-4" strokeWidth={0.75} />
                    </motion.span>
                </Link>
            </h2>
        </section>
    );
}
