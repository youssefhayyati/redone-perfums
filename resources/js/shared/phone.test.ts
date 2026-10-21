import { describe, expect, it } from 'vitest';
import { formatMoroccanPhone, isValidMoroccanPhone, normalizeMoroccanPhone } from './phone';

describe('normalizeMoroccanPhone', () => {
    it.each([
        ['0612345678', '+212612345678'],
        ['06 12 34 56 78', '+212612345678'],
        ['06-12-34-56-78', '+212612345678'],
        ['+212 6 12 34 56 78', '+212612345678'],
        ['00212712345678', '+212712345678'],
        ['212522123456', '+212522123456'],
        ['(05) 22.12.34.56', '+212522123456'],
    ])('normalizes %s', (input, expected) => {
        expect(normalizeMoroccanPhone(input)).toBe(expected);
    });

    it.each(['', '0812345678', '061234567', '06123456789', '+33612345678', 'abcdefghij'])('rejects %s', (input) => {
        expect(normalizeMoroccanPhone(input)).toBeNull();
        expect(isValidMoroccanPhone(input)).toBe(false);
    });
});

describe('formatMoroccanPhone', () => {
    it('groups a valid number by pairs in national format', () => {
        expect(formatMoroccanPhone('+212612345678')).toBe('06 12 34 56 78');
        expect(formatMoroccanPhone('0612345678')).toBe('06 12 34 56 78');
    });

    it('leaves anything else as typed', () => {
        expect(formatMoroccanPhone('12 34')).toBe('12 34');
    });
});
