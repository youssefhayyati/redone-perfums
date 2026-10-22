/**
 * The language of the current page, taken from `<html lang>`, which the server sets
 * from the URL (`/ar/…` is Arabic). The admin's pages are French, so it stays French.
 */
export type Locale = 'fr' | 'ar';

/** "ar" when the document is Arabic, "fr" otherwise. */
export function documentLocale(): Locale {
    return typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'fr';
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
