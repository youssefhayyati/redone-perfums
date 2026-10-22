import { describe, expect, it } from 'vitest';
import { isoToLocalInput, localInputToApi, storeToday } from './datetime';

describe('store wall-clock conversions', () => {
    it('shows API instants in Casablanca time', () => {
        expect(isoToLocalInput('2026-10-21T11:29:00+01:00')).toBe('2026-10-21T11:29');
        expect(isoToLocalInput('2026-10-21T23:30:00Z')).toBe('2026-10-22T00:30');
        expect(isoToLocalInput(null)).toBe('');
        expect(isoToLocalInput('not a date')).toBe('');
    });

    it('sends offset-less store time, null when empty', () => {
        expect(localInputToApi('2026-11-01T09:00')).toBe('2026-11-01T09:00:00');
        expect(localInputToApi('  ')).toBeNull();
    });

    it('gives today in the store timezone', () => {
        expect(storeToday(new Date('2026-10-21T23:30:00Z'))).toBe('2026-10-22');
    });
});
