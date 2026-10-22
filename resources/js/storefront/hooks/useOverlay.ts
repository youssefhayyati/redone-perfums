import { useEffect, useRef, type RefObject } from 'react';
import { pauseSmoothScroll, resumeSmoothScroll } from '../motion/smoothScroll';

const FOCUSABLE =
    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let locks = 0;

function lockScroll(): () => void {
    const root = document.documentElement;

    if (locks === 0) {
        // Keep the layout from shifting when the scrollbar disappears.
        const gap = window.innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        if (gap > 0) {
            root.style.paddingRight = `${gap}px`;
        }
        pauseSmoothScroll();
    }
    locks++;

    return () => {
        locks--;
        if (locks === 0) {
            root.style.overflow = '';
            root.style.paddingRight = '';
            resumeSmoothScroll();
        }
    };
}

/**
 * Modal behaviour for drawers and dialogs: locks page scroll, moves focus inside,
 * keeps Tab within the panel, closes on Escape and gives focus back on close.
 */
export function useOverlay(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void): void {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const panel = ref.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const unlock = lockScroll();

        const focusables = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : []);

        const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel;
        initial?.focus({ preventScroll: true });

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current();

                return;
            }

            if (event.key !== 'Tab' || !panel) {
                return;
            }

            const items = focusables();
            if (items.length === 0) {
                event.preventDefault();

                return;
            }

            const first = items[0]!;
            const last = items[items.length - 1]!;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            unlock();
            previous?.focus({ preventScroll: true });
        };
    }, [open, ref]);
}
