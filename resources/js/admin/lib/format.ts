import { formatMoney } from '@shared/money';

/** Number and change formatting for the admin (French conventions). */

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
const percentChange = new Intl.NumberFormat('fr-FR', { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const weekdayDayMonth = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function formatNumber(value: number): string {
    return integer.format(value);
}

/** 1 284 → "1,3 k"; small values stay exact. */
export function formatCompact(value: number): string {
    return Math.abs(value) < 10_000 ? integer.format(value) : compact.format(value);
}

/** Axis label for an amount in centimes: "0", "500 DH", "12 k DH". */
export function formatCompactMoney(centimes: number): string {
    const dirhams = centimes / 100;

    return dirhams === 0 ? '0' : `${Math.abs(dirhams) < 10_000 ? integer.format(dirhams) : compact.format(dirhams)} DH`;
}

export function formatMoneyOrDash(centimes: number | null | undefined): string {
    return centimes === null || centimes === undefined ? '—' : formatMoney(centimes);
}

export type Trend = 'up' | 'down' | 'flat';

export interface Change {
    label: string;
    trend: Trend;
}

/**
 * Relative change against the previous period. Null when there is nothing to compare
 * with (previous period empty or a value hidden by permissions).
 */
export function describeChange(current: number | null, previous: number | null): Change | null {
    if (current === null || previous === null) {
        return null;
    }

    if (previous === 0) {
        return current === 0 ? { label: 'Stable', trend: 'flat' } : null;
    }

    const ratio = (current - previous) / previous;
    const rounded = Math.round(ratio * 100);

    if (rounded === 0) {
        return { label: 'Stable', trend: 'flat' };
    }

    return { label: percentChange.format(ratio), trend: ratio > 0 ? 'up' : 'down' };
}

/** "2026-10-21" (a calendar day) → "21 oct." */
export function formatDayMonth(day: string): string {
    return dayMonth.format(new Date(`${day}T00:00:00Z`));
}

/** "2026-10-21" → "oct. 26" */
export function formatMonthYear(day: string): string {
    return monthYear.format(new Date(`${day}T00:00:00Z`));
}

/** "2026-10-21" → "mer. 21 octobre" */
export function formatLongDay(day: string): string {
    return weekdayDayMonth.format(new Date(`${day}T00:00:00Z`));
}

/** Two initials for an avatar: "Admin Démo" → "AD". */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0], parts[0]?.[1]];

    return letters.filter(Boolean).join('').toUpperCase() || '?';
}

/** wa.me only takes digits: "+212612345678" → "https://wa.me/212612345678". */
export function whatsappLink(phoneE164: string, message?: string): string {
    const digits = phoneE164.replace(/\D/g, '');
    const text = message ? `?text=${encodeURIComponent(message)}` : '';

    return `https://wa.me/${digits}${text}`;
}

export function telLink(phoneE164: string): string {
    return `tel:${phoneE164.replace(/[^\d+]/g, '')}`;
}
