/** Small DOM helpers shared by components. */

export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const FOCUSABLE_SELECTOR =
    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** Visible, focusable descendants in DOM order. */
export function focusableWithin(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('inert') && element.getClientRects().length > 0,
    );
}

let scrollLocks = 0;

/** Locks page scroll while an overlay is open; nested overlays share the lock. */
export function lockScroll(): () => void {
    const root = document.documentElement;

    if (scrollLocks === 0) {
        const gap = window.innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        if (gap > 0) {
            root.style.paddingRight = `${gap}px`;
        }
    }
    scrollLocks++;

    return () => {
        scrollLocks--;
        if (scrollLocks === 0) {
            root.style.overflow = '';
            root.style.paddingRight = '';
        }
    };
}

/** Stable unique ids for form wiring outside React's useId (e.g. list rows). */
let sequence = 0;
export function uniqueKey(prefix = 'k'): string {
    sequence += 1;

    return `${prefix}${sequence}`;
}
