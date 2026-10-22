import { describe, expect, it } from 'vitest';
import { pageWindow } from './Pagination';

describe('pageWindow', () => {
    it('shows every page when there are few', () => {
        expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
    });

    it('keeps the first, last and neighbouring pages with gaps between', () => {
        expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    });

    it('does not insert a gap between consecutive pages', () => {
        expect(pageWindow(2, 10)).toEqual([1, 2, 3, 'gap', 10]);
        expect(pageWindow(10, 10)).toEqual([1, 'gap', 9, 10]);
    });
});
