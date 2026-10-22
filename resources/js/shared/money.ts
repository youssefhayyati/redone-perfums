import { getLocale } from './locale';

/**
 * Money is exchanged with the API as integer centimes (1 DH = 100 centimes) and is
 * never computed client-side beyond display. Arabic pages keep the same digits and
 * grouping, and write the currency in Arabic.
 */

const whole = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 125000 → "1 250 DH"; 125050 → "1 250,50 DH"; on Arabic pages "1 250 درهم". */
export function formatMoney(centimes: number): string {
    const formatter = centimes % 100 === 0 ? whole : decimal;

    return `${formatter.format(centimes / 100)}\u00A0${getLocale() === 'ar' ? 'درهم' : 'DH'}`;
}

/** "À partir de 450 DH" (« ابتداءً من » on Arabic pages) when the product comes in several prices. */
export function formatPriceFrom(centimes: number | null, hasRange: boolean): string | null {
    if (centimes === null) {
        return null;
    }

    if (!hasRange) {
        return formatMoney(centimes);
    }

    return `${getLocale() === 'ar' ? 'ابتداءً من' : 'À partir de'} ${formatMoney(centimes)}`;
}

/** Admin inputs are typed in dirhams ("450" or "450,50"); returns centimes or null. */
export function parseDirhams(input: string): number | null {
    const normalized = input.replace(/[\s  ]/g, '').replace(',', '.');

    if (normalized === '' || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
        return null;
    }

    return Math.round(Number(normalized) * 100);
}

/** 45050 → "450,50", 45000 → "450" — the editable form of a price. */
export function toDirhamsInput(centimes: number | null | undefined): string {
    if (centimes === null || centimes === undefined) {
        return '';
    }

    return centimes % 100 === 0 ? String(centimes / 100) : (centimes / 100).toFixed(2).replace('.', ',');
}
