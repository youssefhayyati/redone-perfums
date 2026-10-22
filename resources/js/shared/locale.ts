/**
 * The language of the current page, taken from `<html lang>`, which the server sets
 * from the URL (`/ar/…` is Arabic, `/en/…` English). The admin's pages are French, so
 * it stays French.
 */
export type Locale = 'fr' | 'ar' | 'en';

export const LOCALES: readonly Locale[] = ['fr', 'ar', 'en'];

function isLocale(value: string): value is Locale {
    return (LOCALES as readonly string[]).includes(value);
}

/** The document's language when it is one of the storefront's, "fr" otherwise. */
export function documentLocale(): Locale {
    const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';

    return isLocale(lang) ? lang : 'fr';
}

// Read when this module first loads, before any component or module-level label.
let current: Locale = documentLocale();

/** For tests; the page language never changes without a page load. */
export function setLocale(locale: Locale): void {
    current = locale;
}

export function getLocale(): Locale {
    return current;
}

export function isRtl(): boolean {
    return current === 'ar';
}
