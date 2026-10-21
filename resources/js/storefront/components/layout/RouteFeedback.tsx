import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';

/** Thin progress line while a lazily loaded page is on its way. */
export function RouteProgress() {
    const navigation = useNavigation();
    const busy = navigation.state !== 'idle';

    return (
        <AnimatePresence>
            {busy && (
                <motion.div
                    className="fixed inset-x-0 top-0 z-[70] h-px origin-left bg-accent"
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 0.8, transition: { duration: 2.5, ease: [0.1, 0.6, 0.3, 1] } }}
                    exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.3 } }}
                    aria-hidden="true"
                />
            )}
        </AnimatePresence>
    );
}

/**
 * Announces the new page to screen readers and moves focus to the main landmark after
 * client-side navigations (not on the first load).
 */
export function RouteAnnouncer() {
    const { pathname } = useLocation();
    const [message, setMessage] = useState('');
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }

        const timer = window.setTimeout(() => {
            setMessage(document.title);
            document.getElementById('main')?.focus({ preventScroll: true });
        }, 80);

        return () => window.clearTimeout(timer);
    }, [pathname]);

    return (
        <p aria-live="polite" aria-atomic="true" className="sr-only">
            {message}
        </p>
    );
}
