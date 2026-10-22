import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from './locale';
import { formatMoney, formatPriceFrom, parseDirhams, toDirhamsInput } from './money';

afterEach(() => setLocale('fr'));

// Intl inserts a narrow no-break space (U+202F) as thousands separator.
const nbsp = ' ';
const thin = ' ';

describe('formatMoney', () => {
    it('formats whole dirhams without decimals', () => {
        expect(formatMoney(125000)).toBe(`1${thin}250${nbsp}DH`);
    });

    it('keeps two decimals when centimes are present', () => {
        expect(formatMoney(125050)).toBe(`1${thin}250,50${nbsp}DH`);
    });

    it('formats zero', () => {
        expect(formatMoney(0)).toBe(`0${nbsp}DH`);
    });

    it('writes the currency in Arabic on Arabic pages, with the same digits', () => {
        setLocale('ar');
        expect(formatMoney(125050)).toBe(`1${thin}250,50${nbsp}درهم`);
    });
});

describe('formatPriceFrom', () => {
    it('prefixes "À partir de" only when the product has several prices', () => {
        expect(formatPriceFrom(45000, true)).toBe(`À partir de 450${nbsp}DH`);
        expect(formatPriceFrom(45000, false)).toBe(`450${nbsp}DH`);
    });

    it('prefixes the Arabic wording on Arabic pages', () => {
        setLocale('ar');
        expect(formatPriceFrom(45000, true)).toBe(`ابتداءً من 450${nbsp}درهم`);
    });

    it('returns null without a price', () => {
        expect(formatPriceFrom(null, true)).toBeNull();
    });
});

describe('on English pages', () => {
    it('groups thousands with a comma and uses a decimal point, like the e-mails', () => {
        setLocale('en');
        expect(formatMoney(125000)).toBe(`1,250${nbsp}DH`);
        expect(formatMoney(125050)).toBe(`1,250.50${nbsp}DH`);
    });

    it('prefixes "From" when the product has several prices', () => {
        setLocale('en');
        expect(formatPriceFrom(45000, true)).toBe(`From 450${nbsp}DH`);
    });
});

describe('parseDirhams', () => {
    it.each([
        ['450', 45000],
        ['450,5', 45050],
        ['450.50', 45050],
        ['1 250', 125000],
        ['0', 0],
    ])('reads "%s" as %i centimes', (input, expected) => {
        expect(parseDirhams(input)).toBe(expected);
    });

    it.each(['', 'abc', '-5', '4,505', '12,3,4'])('rejects "%s"', (input) => {
        expect(parseDirhams(input)).toBeNull();
    });
});

describe('toDirhamsInput', () => {
    it('round-trips with parseDirhams', () => {
        for (const centimes of [0, 45000, 45050, 125099]) {
            expect(parseDirhams(toDirhamsInput(centimes))).toBe(centimes);
        }
    });

    it('is empty for a missing value', () => {
        expect(toDirhamsInput(null)).toBe('');
        expect(toDirhamsInput(undefined)).toBe('');
    });
});
