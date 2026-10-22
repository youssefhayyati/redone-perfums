import type { StorefrontConfig } from '@shared/types';
import { t } from '../../i18n';

export interface NavItem {
    to: string;
    label: string;
}

/** Primary navigation; the packs entry only exists when packs are on sale. */
export function primaryNav(config: StorefrontConfig): NavItem[] {
    return [
        { to: '/boutique', label: t('Boutique') },
        { to: '/collections', label: t('Collections') },
        ...(config.has_packs ? [{ to: '/coffrets', label: t('Coffrets') }] : []),
        { to: '/decouvrir', label: t('Guide olfactif') },
    ];
}
