import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@shared/types';

const api = vi.hoisted(() => ({
    cart: vi.fn(),
    addItem: vi.fn(),
    addPack: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
}));

vi.mock('../api', () => ({ api }));

function cart(token: string | null, itemsCount: number): Cart {
    return {
        token,
        lines: [],
        items_count: itemsCount,
        subtotal: 0,
        coupon: null,
        discount_total: 0,
        delivery: null,
        total: null,
        merchandise_total: 0,
        is_checkout_ready: false,
        max_quantity: 10,
    };
}

async function freshStore() {
    vi.resetModules();
    const module = await import('./cart');
    const tokens = await import('../cartToken');

    return { ...module, ...tokens };
}

beforeEach(() => {
    localStorage.clear();
    Object.values(api).forEach((mock) => mock.mockReset());
});

describe('cart store', () => {
    it('remembers the token issued by the server', async () => {
        const { cartActions, cartStore, getCartToken } = await freshStore();
        api.addItem.mockResolvedValue(cart('uuid-1', 1));

        await cartActions.addVariant(12, 1);

        expect(getCartToken()).toBe('uuid-1');
        expect(localStorage.getItem('rp-cart')).toBe('uuid-1');
        expect(cartStore.getState().cart?.items_count).toBe(1);
        expect(api.addItem).toHaveBeenCalledWith(12, 1, null);
    });

    it('runs mutations one after another', async () => {
        const { cartActions } = await freshStore();
        const order: string[] = [];
        api.updateItem.mockImplementation(async (_line: number, changes: { quantity: number }) => {
            order.push(`start ${changes.quantity}`);
            await new Promise((resolve) => setTimeout(resolve, changes.quantity === 2 ? 30 : 5));
            order.push(`end ${changes.quantity}`);

            return cart('uuid-1', changes.quantity);
        });

        await Promise.all([cartActions.setQuantity(1, 2), cartActions.setQuantity(1, 3)]);

        expect(order).toEqual(['start 2', 'end 2', 'start 3', 'end 3']);
    });

    it('keeps working after a failed mutation and clears the busy flag', async () => {
        const { cartActions, cartStore } = await freshStore();
        api.addItem.mockRejectedValueOnce(new Error('stock')).mockResolvedValueOnce(cart('uuid-2', 1));

        await expect(cartActions.addVariant(1)).rejects.toThrow('stock');
        await cartActions.addVariant(1);

        expect(cartStore.getState().busy).toBe(false);
        expect(cartStore.getState().cart?.token).toBe('uuid-2');
    });

    it('does not call the API on load when there is no cart yet', async () => {
        const { cartActions, cartStore } = await freshStore();

        await cartActions.load();

        expect(api.cart).not.toHaveBeenCalled();
        expect(cartStore.getState().loading).toBe(false);
    });

    it('forgets a token the server no longer recognises', async () => {
        localStorage.setItem('rp-cart', 'stale');
        const { cartActions, getCartToken } = await freshStore();
        api.cart.mockResolvedValue(cart(null, 0));

        await cartActions.load();

        expect(getCartToken()).toBeNull();
    });

    it('re-prices the bag when the delivery city changes', async () => {
        localStorage.setItem('rp-cart', 'uuid-1');
        const { cartActions, cartStore } = await freshStore();
        api.cart.mockResolvedValue(cart('uuid-1', 1));

        await cartActions.setCity(7);

        expect(api.cart).toHaveBeenCalledWith(7);
        expect(cartStore.getState().cityId).toBe(7);
        expect(localStorage.getItem('rp-city')).toBe('7');
    });
});
