import { describe, expect, it } from 'vitest';
import { cn, formatDate, formatDateTime, plural } from './format';

describe('plural', () => {
    it('uses the singular for 0 and 1, as in French', () => {
        expect(plural(0, 'flacon')).toBe('0 flacon');
        expect(plural(1, 'flacon')).toBe('1 flacon');
        expect(plural(2, 'flacon')).toBe('2 flacons');
    });

    it('accepts an irregular plural', () => {
        expect(plural(3, 'travail', 'travaux')).toBe('3 travaux');
    });
});

describe('dates', () => {
    it('shows dates in the store timezone (Africa/Casablanca)', () => {
        // 23:30 UTC on 31 December is already 1 January in Casablanca (UTC+1).
        expect(formatDate('2026-12-31T23:30:00Z')).toBe('1 janvier 2027');
        expect(formatDateTime('2026-10-21T13:05:00Z')).toBe('21 oct. 2026 à 14:05');
    });

    it('returns an empty string without a date', () => {
        expect(formatDate(null)).toBe('');
        expect(formatDateTime(undefined)).toBe('');
    });
});

describe('cn', () => {
    it('skips falsy entries', () => {
        expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    });
});
