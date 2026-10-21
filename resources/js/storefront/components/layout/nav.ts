import type { StorefrontConfig } from '@shared/types';

export interface NavItem {
    to: string;
    label: string;
}

/** Primary navigation; the packs entry only exists when packs are on sale. */
export function primaryNav(config: StorefrontConfig): NavItem[] {
    return [
        { to: '/boutique', label: 'Boutique' },
        { to: '/collections', label: 'Collections' },
        ...(config.has_packs ? [{ to: '/coffrets', label: 'Coffrets' }] : []),
        { to: '/decouvrir', label: 'Guide olfactif' },
    ];
}
