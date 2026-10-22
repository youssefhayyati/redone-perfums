import { describe, expect, it } from 'vitest';
import { describeChange, formatCompactMoney, initials, telLink, whatsappLink } from './format';

const plainSpaces = (value: string) => value.replace(/[  ]/g, ' ');

describe('describeChange', () => {
    it('compares with the previous period', () => {
        expect(describeChange(120, 100)).toMatchObject({ trend: 'up' });
        expect(plainSpaces(describeChange(120, 100)!.label)).toBe('+20 %');
        expect(describeChange(50, 100)).toMatchObject({ trend: 'down' });
        expect(describeChange(100, 100)).toEqual({ label: 'Stable', trend: 'flat' });
    });

    it('has no comparison without a base or with hidden figures', () => {
        expect(describeChange(10, 0)).toBeNull();
        expect(describeChange(0, 0)).toEqual({ label: 'Stable', trend: 'flat' });
        expect(describeChange(null, 100)).toBeNull();
    });
});

describe('links and labels', () => {
    it('builds WhatsApp and phone links from E.164 numbers', () => {
        expect(whatsappLink('+212612345678')).toBe('https://wa.me/212612345678');
        expect(whatsappLink('+212612345678', 'Bonjour')).toBe('https://wa.me/212612345678?text=Bonjour');
        expect(telLink('+212 6 12 34 56 78')).toBe('tel:+212612345678');
    });

    it('formats axis amounts and initials', () => {
        expect(formatCompactMoney(0)).toBe('0');
        expect(plainSpaces(formatCompactMoney(250_000))).toBe('2 500 DH');
        expect(initials('Admin Démo')).toBe('AD');
        expect(initials('salma')).toBe('SA');
    });
});
