import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { motion, useReducedMotionConfig } from 'framer-motion';

/** Slow start, so the jump to the new page's scroll position happens behind the curtain. */
const CURTAIN_EASE = [0.7, 0, 0.2, 1] as const;

/**
 * Page change: a canvas-coloured curtain edged with a thread of accent rises off the
 * screen, under the sticky header, while the new page fades in behind it. Nothing plays
 * on the first page (it has its own entrance) or when only the query changes (filters).
 * The page wrapper only fades: a transform would break the pages' sticky and fixed parts.
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const location = useLocation();
    const [firstKey] = useState(location.key);
    const reduced = useReducedMotionConfig();
    const navigated = location.key !== firstKey;

    return (
        <>
            <motion.div key={location.pathname} initial={navigated ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.2 }}>
                {children}
            </motion.div>
            {navigated && !reduced && (
                <motion.div
                    key={`curtain:${location.pathname}`}
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 z-30 bg-canvas"
                    initial={{ y: '0%' }}
                    animate={{ y: '-101%' }}
                    transition={{ duration: 0.85, ease: CURTAIN_EASE }}
                >
                    <span className="absolute inset-x-0 bottom-0 h-px bg-accent" />
                </motion.div>
            )}
        </>
    );
}
