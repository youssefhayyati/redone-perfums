/** Display helpers for French copy. Dates are shown in the store's timezone. */

const TIME_ZONE = 'Africa/Casablanca';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
const pluralRules = new Intl.PluralRules('fr');

/** "21 octobre 2026" */
export function formatDate(iso: string | null | undefined): string {
    return iso ? dateFormatter.format(new Date(iso)) : '';
}

/** "21 oct. 2026" */
export function formatShortDate(iso: string | null | undefined): string {
    return iso ? shortDateFormatter.format(new Date(iso)) : '';
}

/** "21 oct. 2026 à 14:05" */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);

    return `${shortDateFormatter.format(date)} à ${timeFormatter.format(date)}`;
}

/** French plural: 0 and 1 take the singular. `plural(2, 'flacon')` → "2 flacons". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count} ${pluralRules.select(count) === 'one' ? singular : pluralForm}`;
}

/** Joins class names, skipping falsy entries. */
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
