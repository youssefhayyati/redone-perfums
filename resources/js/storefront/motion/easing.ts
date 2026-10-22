/** The house curve: a long, soft deceleration (mirrors --ease-luxe in theme.css). */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_LUXE } },
};

export const stagger = (step = 0.08, delay = 0) => ({
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** Opens from the bottom like a curtain; the clip is dropped once open so hover effects can overflow. */
export const unveil = {
    hidden: { clipPath: 'inset(100% 0% 0% 0%)' },
    show: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1.2, ease: EASE_LUXE }, transitionEnd: { clipPath: 'none' } },
};

/** The picture inside an unveiled frame, settling from a slight zoom. */
export const settle = {
    hidden: { scale: 1.18 },
    show: { scale: 1, transition: { duration: 1.6, ease: EASE_LUXE } },
};
