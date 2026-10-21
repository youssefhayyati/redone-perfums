import { describe, expect, it } from 'vitest';
import { mergeParams, readParams, toApiQuery, writeParams } from './query';

const DEFAULTS = { status: '', search: '', featured: false, page: 1 };
const ALLOWED = { status: ['', 'pending', 'shipped'] };

describe('readParams', () => {
    it('falls back to defaults for missing values', () => {
        expect(readParams(new URLSearchParams(), DEFAULTS, ALLOWED)).toEqual(DEFAULTS);
    });

    it('parses numbers, booleans and allowed strings', () => {
        const params = new URLSearchParams('status=pending&search=%20salma%20&featured=1&page=3');
        expect(readParams(params, DEFAULTS, ALLOWED)).toEqual({ status: 'pending', search: 'salma', featured: true, page: 3 });
    });

    it('rejects unknown enum values and malformed pages', () => {
        const params = new URLSearchParams('status=lost&page=2abc');
        expect(readParams(params, DEFAULTS, ALLOWED)).toEqual(DEFAULTS);
        expect(readParams(new URLSearchParams('page=0'), DEFAULTS).page).toBe(1);
        expect(readParams(new URLSearchParams('page=-4'), DEFAULTS).page).toBe(1);
    });
});

describe('writeParams', () => {
    it('omits defaults and serializes the rest', () => {
        expect(writeParams(DEFAULTS, DEFAULTS).toString()).toBe('');
        expect(writeParams({ status: 'shipped', search: ' oud ', featured: true, page: 2 }, DEFAULTS).toString()).toBe('status=shipped&search=oud&featured=1&page=2');
    });

    it('round-trips through readParams', () => {
        const values = { status: 'pending', search: 'RP-261021', featured: false, page: 4 };
        expect(readParams(writeParams(values, DEFAULTS), DEFAULTS, ALLOWED)).toEqual(values);
    });
});

describe('mergeParams', () => {
    it('goes back to page 1 when a filter changes', () => {
        expect(mergeParams({ ...DEFAULTS, page: 5 }, { status: 'pending' }, DEFAULTS)).toEqual({ ...DEFAULTS, status: 'pending', page: 1 });
    });

    it('keeps the requested page when paginating', () => {
        expect(mergeParams({ ...DEFAULTS, status: 'pending' }, { page: 3 }, DEFAULTS)).toEqual({ ...DEFAULTS, status: 'pending', page: 3 });
    });
});

describe('toApiQuery', () => {
    it('drops empty strings and false flags', () => {
        expect(toApiQuery({ status: '', search: 'x', featured: false, page: 2 })).toEqual({ search: 'x', page: 2 });
        expect(toApiQuery({ featured: true, trashed: 'only' })).toEqual({ featured: true, trashed: 'only' });
    });
});
