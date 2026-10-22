import { describe, expect, it } from 'vitest';
import { pageWindow, rangeOf } from './pagination';

describe('pageWindow', () => {
    it('shows the ends, the neighbourhood and gaps', () => {
        expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
        expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
        expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 'gap', 7]);
        expect(pageWindow(1, 1)).toEqual([1]);
    });
});

describe('rangeOf', () => {
    it('computes the visible range when the API omits from/to', () => {
        expect(rangeOf({ current_page: 2, per_page: 20, total: 45 })).toEqual({ from: 21, to: 40 });
        expect(rangeOf({ current_page: 3, per_page: 20, total: 45 })).toEqual({ from: 41, to: 45 });
        expect(rangeOf({ current_page: 1, per_page: 20, total: 0 })).toEqual({ from: 0, to: 0 });
    });
});
