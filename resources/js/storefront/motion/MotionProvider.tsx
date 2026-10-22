import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { EASE_LUXE } from './easing';
import { startPointerEffects } from './pointerEffects';
import { startSmoothScroll } from './smoothScroll';

function prefersLowPower(): boolean {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

    return Boolean(nav.connection?.saveData) || (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Single switch for motion: transform and layout animations are turned off when the
 * visitor asks for reduced motion, and always on low-power devices (opacity fades
 * remain, so content still appears smoothly). Smooth scrolling and pointer effects
 * only run with full motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    const [lowPower] = useState(prefersLowPower);

    useEffect(() => {
        if (lowPower || prefersReducedMotion()) {
            return;
        }
        const stopScroll = startSmoothScroll();
        const stopPointer = startPointerEffects();

        return () => {
            stopScroll();
            stopPointer();
        };
    }, [lowPower]);

    return (
        <MotionConfig reducedMotion={lowPower ? 'always' : 'user'} transition={{ duration: 0.8, ease: EASE_LUXE }}>
            {children}
        </MotionConfig>
    );
}
