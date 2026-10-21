import { describe, expect, it } from 'vitest';
import { moveItem, toggleItem } from './arrays';
import { stockAfter } from './stock';

describe('moveItem', () => {
    it('moves an entry and ignores invalid moves', () => {
        expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
        expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
        const same = [1, 2];
        expect(moveItem(same, 0, 5)).toBe(same);
    });

    it('toggles values', () => {
        expect(toggleItem([1, 2], 2)).toEqual([1]);
        expect(toggleItem([1], 3)).toEqual([1, 3]);
    });
});

describe('stockAfter', () => {
    it('previews set, add and remove adjustments', () => {
        expect(stockAfter(10, 'set', 4)).toBe(4);
        expect(stockAfter(10, 'add', 4)).toBe(14);
        expect(stockAfter(10, 'remove', 4)).toBe(6);
    });
});
