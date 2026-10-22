/**
 * Pointer-driven hover effects, delegated from the document so components only opt in
 * with a class or an attribute. The positions are written as CSS custom properties and
 * storefront.css does the drawing:
 * - `.btn`: magnetic, drifts towards the pointer (--magnet-x / --magnet-y);
 * - `[data-tilt]`: turns towards the pointer with a moving glint (--tilt-x / --tilt-y,
 *   --glint-x / --glint-y); `data-tilt="soft"` turns less.
 * Only started with full motion on a precise pointer (see MotionProvider).
 */
const MAGNETIC = '.btn:not(:disabled):not([aria-disabled="true"])';
const TILT = '[data-tilt]';
const MAX_PULL = 10;
const MAX_TILT = { full: 7, soft: 3 };

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

function release(element: HTMLElement | null, ...properties: string[]): void {
    if (!element) {
        return;
    }
    for (const property of properties) {
        element.style.removeProperty(property);
    }
    delete element.dataset.pointerActive;
}

export function startPointerEffects(): () => void {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        return () => {};
    }

    let magnet: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;
    let pending: PointerEvent | null = null;
    let frame = 0;

    const releaseMagnet = () => {
        release(magnet, '--magnet-x', '--magnet-y');
        magnet = null;
    };
    const releaseTilt = () => {
        release(tilt, '--tilt-x', '--tilt-y', '--glint-x', '--glint-y');
        tilt = null;
    };
    const releaseAll = () => {
        releaseMagnet();
        releaseTilt();
    };

    const apply = () => {
        frame = 0;
        const event = pending;
        if (!event || !(event.target instanceof Element)) {
            return;
        }

        const nextMagnet = event.target.closest<HTMLElement>(MAGNETIC);
        if (nextMagnet !== magnet) {
            releaseMagnet();
            magnet = nextMagnet;
        }
        if (magnet) {
            const box = magnet.getBoundingClientRect();
            const x = clamp((event.clientX - (box.left + box.width / 2)) * 0.25, MAX_PULL);
            const y = clamp((event.clientY - (box.top + box.height / 2)) * 0.35, MAX_PULL * 0.6);
            magnet.style.setProperty('--magnet-x', `${x.toFixed(1)}px`);
            magnet.style.setProperty('--magnet-y', `${y.toFixed(1)}px`);
            magnet.dataset.pointerActive = '';
        }

        const nextTilt = event.target.closest<HTMLElement>(TILT);
        if (nextTilt !== tilt) {
            releaseTilt();
            tilt = nextTilt;
        }
        if (tilt) {
            const box = tilt.getBoundingClientRect();
            const px = (event.clientX - box.left) / box.width;
            const py = (event.clientY - box.top) / box.height;
            const limit = tilt.dataset.tilt === 'soft' ? MAX_TILT.soft : MAX_TILT.full;
            tilt.style.setProperty('--tilt-x', `${((0.5 - py) * limit * 2).toFixed(2)}deg`);
            tilt.style.setProperty('--tilt-y', `${((px - 0.5) * limit * 2).toFixed(2)}deg`);
            tilt.style.setProperty('--glint-x', `${(px * 100).toFixed(1)}%`);
            tilt.style.setProperty('--glint-y', `${(py * 100).toFixed(1)}%`);
            tilt.dataset.pointerActive = '';
        }
    };

    const onMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
            return;
        }
        pending = event;
        if (!frame) {
            frame = requestAnimationFrame(apply);
        }
    };
    // The pointer left the window: nothing stays pulled or turned.
    const onOut = (event: PointerEvent) => {
        if (event.relatedTarget === null) {
            releaseAll();
        }
    };
    // Scrolling moves elements away from a still pointer.
    const onScroll = () => {
        if (magnet || tilt) {
            releaseAll();
        }
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', releaseAll);

    return () => {
        cancelAnimationFrame(frame);
        releaseAll();
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerout', onOut);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('blur', releaseAll);
    };
}
