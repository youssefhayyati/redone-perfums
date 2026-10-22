import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const item = { id: 'RP-NUITDAMB-50', name: 'Nuit d’Ambre', variant: '50 ml', price: 69000, quantity: 2 };

describe('analytics', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();
        document.head.innerHTML = '';
        delete window.gtag;
        delete window.fbq;
        delete window.dataLayer;
    });

    afterEach(() => vi.restoreAllMocks());

    it('loads nothing and sends nothing before the visitor accepts', async () => {
        const analytics = await import('./analytics');
        analytics.initAnalytics({ ga4: 'G-AB12CD34EF', meta_pixel: '1234567890' });
        analytics.track({ type: 'view_item', item });

        expect(document.head.querySelectorAll('script')).toHaveLength(0);
        expect(window.gtag).toBeUndefined();
        expect(window.fbq).toBeUndefined();
    });

    it('loads both trackers once accepted, and remembers the choice', async () => {
        const analytics = await import('./analytics');
        analytics.initAnalytics({ ga4: 'G-AB12CD34EF', meta_pixel: '1234567890' });
        analytics.setConsent('granted');

        const sources = [...document.head.querySelectorAll('script')].map((script) => script.src);
        expect(sources).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF', 'https://connect.facebook.net/en_US/fbevents.js']);
        expect(localStorage.getItem('rp-consent')).toBe('granted');
    });

    it('loads the trackers on the next visit without asking again', async () => {
        localStorage.setItem('rp-consent', 'granted');
        const analytics = await import('./analytics');
        analytics.initAnalytics({ ga4: 'G-AB12CD34EF' });

        expect(document.head.querySelectorAll('script')).toHaveLength(1);
    });

    it('stays silent after a refusal', async () => {
        const analytics = await import('./analytics');
        analytics.initAnalytics({ ga4: 'G-AB12CD34EF' });
        analytics.setConsent('denied');

        expect(document.head.querySelectorAll('script')).toHaveLength(0);
        expect(localStorage.getItem('rp-consent')).toBe('denied');
    });
});

describe('event mapping', () => {
    it('sends GA4 ecommerce events in dirhams', async () => {
        const { toGa4 } = await import('./analytics');

        expect(toGa4({ type: 'purchase', reference: 'RP-1', value: 141000, shipping: 3000, items: [item] })).toEqual([
            'purchase',
            { transaction_id: 'RP-1', currency: 'MAD', value: 1410, shipping: 30, items: [{ item_id: 'RP-NUITDAMB-50', item_name: 'Nuit d’Ambre', item_variant: '50 ml', price: 690, quantity: 2 }] },
        ]);
    });

    it('sends Meta standard events', async () => {
        const { toPixel } = await import('./analytics');

        expect(toPixel({ type: 'page_view', path: '/', title: 'Myperfum' })).toEqual(['PageView']);
        expect(toPixel({ type: 'add_to_cart', items: [item] })).toEqual([
            'AddToCart',
            { content_ids: ['RP-NUITDAMB-50'], content_type: 'product', contents: [{ id: 'RP-NUITDAMB-50', quantity: 2 }], value: 1380, currency: 'MAD' },
        ]);
    });
});
