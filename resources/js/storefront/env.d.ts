import type { StorefrontConfig } from '@shared/types';

declare global {
    interface Window {
        /** Inlined by resources/views/storefront.blade.php (App\Services\Settings\StorefrontConfig). */
        __STOREFRONT__?: StorefrontConfig;
    }
}

export {};
