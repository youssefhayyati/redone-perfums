import { useEffect, useState } from 'react';
import * as api from '../api';

const EVENT = 'admin:orders-changed';

/** Tells the shell that order statuses changed (sidebar counter refresh). */
export function notifyOrdersChanged(): void {
    window.dispatchEvent(new Event(EVENT));
}

/**
 * Number of pending orders for the sidebar badge: loaded with the shell, refreshed
 * after order changes and every few minutes while the tab is visible.
 */
export function usePendingOrders(enabled: boolean): number | null {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            setCount(null);

            return;
        }

        let controller: AbortController | null = null;

        const load = () => {
            controller?.abort();
            controller = new AbortController();
            api.orders.list({ per_page: 1 }, controller.signal).then(
                (response) => setCount(Array.isArray(response.counts) ? 0 : (response.counts.pending ?? 0)),
                () => undefined,
            );
        };

        load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                load();
            }
        }, 180_000);
        window.addEventListener(EVENT, load);

        return () => {
            controller?.abort();
            window.clearInterval(timer);
            window.removeEventListener(EVENT, load);
        };
    }, [enabled]);

    return count;
}
