import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { EASE_LUXE, fadeUp, stagger } from './easing';

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

export function RevealItem({ as = 'div', className, children }: Omit<RevealProps, 'delay' | 'y'>) {
    const Element = elements[as];

    return (
        <Element className={className} variants={fadeUp}>
            {children}
        </Element>
    );
}
