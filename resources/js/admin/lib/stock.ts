import type { AdjustMode } from '../types';

/** Stock after an adjustment, for the preview line of the adjust dialog. */
export function stockAfter(current: number, mode: AdjustMode, quantity: number): number {
    if (mode === 'set') {
        return quantity;
    }

    return mode === 'add' ? current + quantity : current - quantity;
}
