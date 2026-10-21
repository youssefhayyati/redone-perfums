import { motion, useReducedMotionConfig } from 'framer-motion';

/**
 * A slow diagonal glint across a bottle, as if catching a light. The parent must be
 * `relative overflow-hidden`. Skipped entirely when motion is reduced.
 */
export function LightSweep({ delay = 1.4, repeatDelay = 6.5 }: { delay?: number; repeatDelay?: number }) {
    const reduced = useReducedMotionConfig();

    if (reduced) {
        return null;
    }

    return (
        <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-[-20%] left-0 w-1/3 -skew-x-[18deg] mix-blend-soft-light"
            style={{ background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent)' }}
            initial={{ x: '-150%', opacity: 0 }}
            animate={{ x: ['-150%', '420%'], opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, ease: 'easeInOut', delay, repeat: Infinity, repeatDelay }}
        />
    );
}
