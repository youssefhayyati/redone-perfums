import { describe, expect, it } from 'vitest';
import { areaPath, labelIndices, linePath, monthStartIndices, nearestIndex, niceTicks } from './chart';

describe('niceTicks', () => {
    it('rounds to clean steps covering the maximum', () => {
        expect(niceTicks(345)).toEqual([0, 100, 200, 300, 400]);
        expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10]);
    });

    it('uses whole steps for counts and display units for money', () => {
        expect(niceTicks(3, { integer: true })).toEqual([0, 1, 2, 3]);
        expect(niceTicks(345_600, { unit: 100 })).toEqual([0, 100_000, 200_000, 300_000, 400_000]);
    });

    it('handles an empty series', () => {
        expect(niceTicks(0)).toEqual([0, 1]);
        expect(niceTicks(0, { unit: 100 })).toEqual([0, 100]);
    });
});

describe('paths', () => {
    it('draws a line and closes the area on the baseline', () => {
        const points = [
            { x: 0, y: 10 },
            { x: 5, y: 2 },
        ];
        expect(linePath(points)).toBe('M0.00 10.00 L5.00 2.00');
        expect(areaPath(points, 20)).toBe('M0.00 10.00 L5.00 2.00 L5.00 20.00 L0.00 20.00 Z');
        expect(areaPath([], 20)).toBe('');
    });
});

describe('axis labels', () => {
    it('spreads labels and keeps both ends', () => {
        expect(labelIndices(30, 5)).toEqual([0, 7, 15, 22, 29]);
        expect(labelIndices(3, 5)).toEqual([0, 1, 2]);
        expect(labelIndices(0, 5)).toEqual([]);
    });

    it('labels month starts on long ranges', () => {
        const days = ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02', '2026-03-01'];
        expect(monthStartIndices(days, 6)).toEqual([2, 4]);
        expect(monthStartIndices(days, 1)).toEqual([2]);
    });

    it('snaps the pointer to the nearest day', () => {
        expect(nearestIndex(50, 50, 300, 31)).toBe(0);
        expect(nearestIndex(200, 50, 300, 31)).toBe(15);
        expect(nearestIndex(999, 50, 300, 31)).toBe(30);
    });
});
