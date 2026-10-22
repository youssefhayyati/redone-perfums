import { getLocale, type Locale } from './locale';

/**
 * Display helpers. Dates are shown in the store's timezone, in French or in Arabic
 * with the Western digits used in Morocco.
 */

const TIME_ZONE = 'Africa/Casablanca';

const INTL_LOCALES: Record<Locale, string> = { fr: 'fr-FR', ar: 'ar-MA-u-nu-latn' };

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormat(style: 'long' | 'short' | 'time'): Intl.DateTimeFormat {
    const locale = getLocale();
    const key = `${locale}:${style}`;
    let formatter = dateFormatters.get(key);

    if (!formatter) {
        const options: Intl.DateTimeFormatOptions = style === 'time' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: style, year: 'numeric' };
        formatter = new Intl.DateTimeFormat(INTL_LOCALES[locale], { ...options, timeZone: TIME_ZONE });
        dateFormatters.set(key, formatter);
    }

    return formatter;
}

const pluralRules = new Intl.PluralRules('fr');

/** "21 octobre 2026" */
export function formatDate(iso: string | null | undefined): string {
    return iso ? dateFormat('long').format(new Date(iso)) : '';
}

/** "21 oct. 2026" */
export function formatShortDate(iso: string | null | undefined): string {
    return iso ? dateFormat('short').format(new Date(iso)) : '';
}

/** "21 oct. 2026 à 14:05" */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);

    return `${dateFormat('short').format(date)} ${getLocale() === 'ar' ? 'على الساعة' : 'à'} ${dateFormat('time').format(date)}`;
}

/** French plural: 0 and 1 take the singular. `plural(2, 'flacon')` → "2 flacons". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count} ${pluralRules.select(count) === 'one' ? singular : pluralForm}`;
}

/** Joins class names, skipping falsy entries. */
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
