import { createStore, useStore } from '@shared/store';
import type { Cart, Order, StorefrontConfig } from '@shared/types';

/**
 * Audience measurement (Google Analytics 4, Meta Pixel), configured in Settings →
 * Mesure d'audience. Nothing is loaded and nothing is sent until the visitor accepts
 * cookies; refusing is remembered too. Prices are sent in dirhams (MAD).
 */
export type Consent = 'granted' | 'denied' | null;

export interface TrackedItem {
    id: string;
    name: string;
    /** Unit price in centimes. */
    price: number;
    quantity: number;
    variant?: string;
}

export type TrackedEvent =
    | { type: 'page_view'; path: string; title: string }
    | { type: 'view_item'; item: TrackedItem }
    | { type: 'add_to_cart'; items: TrackedItem[] }
    | { type: 'begin_checkout'; value: number; items: TrackedItem[] }
    | { type: 'purchase'; reference: string; value: number; shipping: number; items: TrackedItem[] };

type Trackers = StorefrontConfig['analytics'];

const CONSENT_KEY = 'rp-consent';
const CURRENCY = 'MAD';

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...args: unknown[]) => void; push?: unknown };
        _fbq?: unknown;
    }
}

function storedConsent(): Consent {
    try {
        const value = localStorage.getItem(CONSENT_KEY);

        return value === 'granted' || value === 'denied' ? value : null;
    } catch {
        return null;
    }
}

export const consentStore = createStore<{ consent: Consent; asking: boolean }>({ consent: storedConsent(), asking: false });

export function useConsent() {
    return useStore(consentStore, (state) => state);
}

let trackers: Trackers = {};
let loaded = false;

const dirhams = (centimes: number) => Math.round(centimes) / 100;

/** The GA4 event (name and parameters) for a storefront event. */
export function toGa4(event: TrackedEvent): [string, Record<string, unknown>] {
    const items = (list: TrackedItem[]) => list.map((item) => ({ item_id: item.id, item_name: item.name, item_variant: item.variant, price: dirhams(item.price), quantity: item.quantity }));
    const total = (list: TrackedItem[]) => dirhams(list.reduce((sum, item) => sum + item.price * item.quantity, 0));

    switch (event.type) {
        case 'page_view':
            return ['page_view', { page_path: event.path, page_title: event.title }];
        case 'view_item':
            return ['view_item', { currency: CURRENCY, value: dirhams(event.item.price), items: items([event.item]) }];
        case 'add_to_cart':
            return ['add_to_cart', { currency: CURRENCY, value: total(event.items), items: items(event.items) }];
        case 'begin_checkout':
            return ['begin_checkout', { currency: CURRENCY, value: dirhams(event.value), items: items(event.items) }];
        case 'purchase':
            return ['purchase', { transaction_id: event.reference, currency: CURRENCY, value: dirhams(event.value), shipping: dirhams(event.shipping), items: items(event.items) }];
    }
}

/** The Meta Pixel standard event for a storefront event. */
export function toPixel(event: TrackedEvent): [string, Record<string, unknown>?] {
    const contents = (list: TrackedItem[]) => ({ content_ids: list.map((item) => item.id), content_type: 'product', contents: list.map((item) => ({ id: item.id, quantity: item.quantity })) });

    switch (event.type) {
        case 'page_view':
            return ['PageView'];
        case 'view_item':
            return ['ViewContent', { ...contents([event.item]), content_name: event.item.name, value: dirhams(event.item.price), currency: CURRENCY }];
        case 'add_to_cart':
            return ['AddToCart', { ...contents(event.items), value: dirhams(event.items.reduce((sum, item) => sum + item.price * item.quantity, 0)), currency: CURRENCY }];
        case 'begin_checkout':
            return ['InitiateCheckout', { ...contents(event.items), num_items: event.items.reduce((sum, item) => sum + item.quantity, 0), value: dirhams(event.value), currency: CURRENCY }];
        case 'purchase':
            return ['Purchase', { ...contents(event.items), value: dirhams(event.value), currency: CURRENCY }];
    }
}

function loadScript(src: string): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
}

function loadTrackers(): void {
    if (loaded) {
        return;
    }
    loaded = true;

    if (trackers.ga4) {
        window.dataLayer = window.dataLayer ?? [];
        window.gtag = function gtag() {
            // gtag.js reads the arguments object itself, not an array.
            window.dataLayer!.push(arguments);
        };
        window.gtag('js', new Date());
        // Page views are sent by the router, the storefront being a single-page app.
        window.gtag('config', trackers.ga4, { send_page_view: false });
        loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trackers.ga4)}`);
    }

    if (trackers.meta_pixel && !window.fbq) {
        const fbq = function (...args: unknown[]) {
            if (fbq.callMethod) {
                fbq.callMethod(...args);
            } else {
                fbq.queue!.push(args);
            }
        } as NonNullable<Window['fbq']>;
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
        window.fbq = fbq;
        window._fbq = fbq;
        loadScript('https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', trackers.meta_pixel);
    }
}

/** Reads the configured trackers; loads them right away if the visitor already accepted. */
export function initAnalytics(configured: Trackers): void {
    trackers = configured ?? {};
    if (hasTrackers() && consentStore.getState().consent === 'granted') {
        loadTrackers();
    }
}

export function hasTrackers(): boolean {
    return Boolean(trackers.ga4 || trackers.meta_pixel);
}

/** Records the visitor's choice. Withdrawing a consent already given reloads the page, which drops the trackers. */
export function setConsent(consent: Exclude<Consent, null>): void {
    const previous = consentStore.getState().consent;
    try {
        localStorage.setItem(CONSENT_KEY, consent);
    } catch {
        // Kept for this visit only.
    }
    consentStore.setState({ consent, asking: false });

    if (consent === 'granted') {
        loadTrackers();
        track({ type: 'page_view', path: window.location.pathname, title: document.title });
    } else if (previous === 'granted' && loaded) {
        window.location.reload();
    }
}

/** Opens the cookie choice again (footer link). */
export function askConsent(): void {
    consentStore.setState({ asking: true });
}

/** Sends an event to every loaded tracker; a no-op without consent. */
export function track(event: TrackedEvent): void {
    if (!loaded) {
        return;
    }
    if (trackers.ga4 && window.gtag) {
        const [name, params] = toGa4(event);
        window.gtag('event', name, params);
    }
    if (trackers.meta_pixel && window.fbq) {
        window.fbq('track', ...toPixel(event));
    }
}

/** The bag's lines as tracked items: formats by SKU, packs by id. */
export function cartItems(cart: Cart): TrackedItem[] {
    return cart.lines.map((line) =>
        line.type === 'product'
            ? { id: line.variant?.sku ?? String(line.id), name: line.product?.name ?? '', variant: line.variant?.label, price: line.unit_price ?? 0, quantity: line.quantity }
            : { id: `pack-${line.pack?.id ?? line.id}`, name: line.pack?.name ?? '', price: line.unit_price ?? 0, quantity: line.quantity },
    );
}

/** An order's lines as tracked items, identified like the bag's. */
export function orderItems(order: Order): TrackedItem[] {
    return (order.items ?? []).map((item) => ({
        id: item.sku ?? `pack-${item.pack_id ?? item.id}`,
        name: item.name,
        variant: item.variant_label ?? undefined,
        price: item.unit_price,
        quantity: item.quantity,
    }));
}
