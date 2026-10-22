import { Fragment, useRef, type ReactNode } from 'react';
import { motion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion';
import { cn } from '@shared/format';
import { EASE_LUXE, fadeUp, settle, stagger, unveil } from './easing';

const elements = {
    div: motion.div,
    section: motion.section,
    article: motion.article,
    header: motion.header,
    li: motion.li,
    ul: motion.ul,
    p: motion.p,
    figure: motion.figure,
};

type Tag = keyof typeof elements;

interface RevealProps {
    as?: Tag;
    className?: string;
    delay?: number;
    /** Distance travelled upwards, in px. */
    y?: number;
    children: ReactNode;
}

const viewport = { once: true, margin: '0px 0px -12% 0px' } as const;

/** Editorial reveal: fades and rises once when scrolled into view. */
export function Reveal({ as = 'div', className, delay = 0, y = 28, children }: RevealProps) {
    const Element = elements[as];

    return (
        <Element
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.9, ease: EASE_LUXE, delay }}
        >
            {children}
        </Element>
    );
}

/** Container whose <RevealItem> children appear one after another. */
export function RevealGroup({ as = 'div', className, step = 0.08, delay = 0, children }: Omit<RevealProps, 'y'> & { step?: number }) {
    const Element = elements[as];

    return (
        <Element className={className} variants={stagger(step, delay)} initial="hidden" whileInView="show" viewport={viewport}>
            {children}
        </Element>
    );
}

/**
 * One step of a RevealGroup. `rise` fades it up; `unveil` opens it from the bottom like a
 * curtain, for images (put the picture in a <MediaSettle>). Reduced motion: a fade.
 */
export function RevealItem({ as = 'div', className, variant = 'rise', children }: Omit<RevealProps, 'delay' | 'y'> & { variant?: 'rise' | 'unveil' }) {
    const Element = elements[as];
    const reduced = useReducedMotionConfig();

    return (
        <Element className={className} variants={variant === 'unveil' && !reduced ? unveil : fadeUp}>
            {children}
        </Element>
    );
}

/** A picture frame inside a rising RevealItem (a card with text under it): only the frame opens like a curtain. */
export function UnveilFrame({ className, children }: { className?: string; children: ReactNode }) {
    const reduced = useReducedMotionConfig();

    return (
        <motion.div className={className} variants={reduced ? undefined : unveil}>
            {children}
        </motion.div>
    );
}

/** The picture inside an unveiled item: it settles from a slight zoom as the mask opens. */
export function MediaSettle({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <motion.div className={className} variants={settle}>
            {children}
        </motion.div>
    );
}

/**
 * A layer that drifts against the scroll, `distance` px each way, while its box crosses
 * the viewport: backgrounds feel deeper than the page. The class must position the box
 * (absolute or relative); the drifting layer overflows it by the distance, hidden.
 */
export function Parallax({ distance = 60, className, children }: { distance?: number; className?: string; children: ReactNode }) {
    const box = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotionConfig();
    const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

    return (
        <div ref={box} className={cn('overflow-hidden', className)}>
            <motion.div className="absolute inset-x-0" style={{ top: -distance, bottom: -distance, y: reduced ? 0 : y }}>
                {children}
            </motion.div>
        </div>
    );
}

/** A hairline that draws itself from the reading start once scrolled into view. Grows to fill a flex row. */
export function RevealRule({ className }: { className?: string }) {
    return (
        <motion.span
            aria-hidden="true"
            className={cn('h-px flex-1 origin-left bg-line rtl:origin-right', className)}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewport}
            transition={{ duration: 1.4, ease: EASE_LUXE, delay: 0.1 }}
        />
    );
}

const textElements = {
    h1: motion.h1,
    h2: motion.h2,
    p: motion.p,
};

const wordRise = {
    hidden: { y: '108%' },
    show: { y: '0%', transition: { duration: 1.1, ease: EASE_LUXE } },
};

interface RevealWordsProps {
    text: string;
    as?: keyof typeof textElements;
    id?: string;
    className?: string;
    /** Sets the last word in accent italic, for titles of three words or more. */
    accentLast?: boolean;
    /** `view` plays once scrolled into view; `parent` follows the enclosing variants. */
    trigger?: 'view' | 'parent';
    delay?: number;
}

/**
 * Title whose words rise one after another from behind a mask. Real spaces sit between
 * the masks, so the title copies, searches and reads aloud as ordinary text.
 */
export function RevealWords({ text, as = 'h2', id, className, accentLast = false, trigger = 'view', delay = 0 }: RevealWordsProps) {
    const Element = textElements[as];
    const words = text.split(/\s+/).filter(Boolean);
    const playback = trigger === 'view' ? { initial: 'hidden', whileInView: 'show', viewport } : {};

    return (
        <Element id={id} className={className} variants={stagger(0.06, delay)} {...playback}>
            {words.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                    {index > 0 && ' '}
                    {/* The padding leaves room for italic overhangs inside the mask; the margin cancels it. */}
                    <span className="-mx-[0.1em] inline-block overflow-hidden px-[0.1em] pb-[0.12em] align-bottom">
                        <motion.span variants={wordRise} className={cn('inline-block', accentLast && words.length > 2 && index === words.length - 1 && 'text-accent italic')}>
                            {word}
                        </motion.span>
                    </span>
                </Fragment>
            ))}
        </Element>
    );
}
