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
