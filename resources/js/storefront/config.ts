import type { StorefrontConfig } from '@shared/types';
import { createStore, useStore } from '@shared/store';

const FALLBACK: StorefrontConfig = {
    store: { name: 'Myperfum', wordmark: 'myperfum', descriptor: 'Maison de parfum', meta_description: '' },
    analytics: {},
    announcement: { enabled: false, text: null, link: null },
    contact: { email: null, phone: null, whatsapp: null, address: null, hours: null },
    location: null,
    social: {},
    payment_methods: [],
    checkout: { email_required: false },
    benefits: [],
    pages: [],
    collections: [],
    has_packs: false,
};

/** Store configuration inlined in the HTML shell, so the first render needs no request. */
export const configStore = createStore<{ config: StorefrontConfig }>({ config: window.__STOREFRONT__ ?? FALLBACK });

export function useConfig(): StorefrontConfig {
    return useStore(configStore, (state) => state.config);
}
