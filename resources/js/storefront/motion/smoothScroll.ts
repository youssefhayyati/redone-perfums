import Lenis from 'lenis';

/**
 * Eased wheel scrolling (Lenis). The page keeps its native scroll position, so sticky
 * elements, anchors, keyboard and Framer's useScroll work as usual; touch stays native.
 * Only started with full motion (see MotionProvider).
 */
let lenis: Lenis | null = null;

export function startSmoothScroll(): () => void {
    lenis = new Lenis({
        autoRaf: true,
        lerp: 0.1,
        anchors: true,
        // Drawers, lists and text areas that can scroll take the wheel themselves.
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
    });

    return () => {
        lenis?.destroy();
        lenis = null;
    };
}

/** While an overlay locks the page: the wheel must not move what is behind it. */
export function pauseSmoothScroll(): void {
    lenis?.stop();
}

export function resumeSmoothScroll(): void {
    lenis?.start();
}

/** Drops any eased scroll still in flight, so the router's scroll position is kept. */
export function settleSmoothScroll(): void {
    if (lenis && !lenis.isStopped) {
        lenis.stop();
        lenis.start();
    }
}
