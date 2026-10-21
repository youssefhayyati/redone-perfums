import type { Cart } from '@shared/types';
import { createStore, useStore } from '@shared/store';
import { api } from '../api';
import { getCartToken, setCartToken } from '../cartToken';

/**
 * The bag. Every figure comes from the server (CartCalculator); the client only sends
 * identifiers. Mutations run one at a time so quick taps on +/− cannot race.
 */
interface CartState {
    cart: Cart | null;
    /** True until the first response arrives. */
    loading: boolean;
    /** A mutation is in flight. */
    busy: boolean;
    /** City chosen for the delivery estimate (persisted). */
    cityId: number | null;
}

const CITY_KEY = 'rp-city';

function storedCity(): number | null {
    try {
        const value = Number(localStorage.getItem(CITY_KEY));

        return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export const cartStore = createStore<CartState>({ cart: null, loading: true, busy: false, cityId: storedCity() });

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);

    return run;
}

function receive(cart: Cart): Cart {
    setCartToken(cart.token);
    cartStore.setState({ cart, loading: false });

    return cart;
}

async function mutate(request: (cityId: number | null) => Promise<Cart>): Promise<Cart> {
    return enqueue(async () => {
        cartStore.setState({ busy: true });
        try {
            return receive(await request(cartStore.getState().cityId));
        } finally {
            cartStore.setState({ busy: false });
        }
    });
}

export const cartActions = {
    async load(): Promise<void> {
        if (getCartToken() === null) {
            cartStore.setState({ cart: null, loading: false });

            return;
        }

        try {
            receive(await api.cart(cartStore.getState().cityId));
        } catch {
            cartStore.setState({ loading: false });
        }
    },

    addVariant: (variantId: number, quantity = 1) => mutate((city) => api.addItem(variantId, quantity, city)),

    addPack: (packId: number, selections: number[], quantity = 1) => mutate((city) => api.addPack(packId, selections, quantity, city)),

    setQuantity: (lineId: number, quantity: number) => mutate((city) => api.updateItem(lineId, { quantity }, city)),

    replaceSelections: (lineId: number, selections: number[]) => mutate((city) => api.updateItem(lineId, { selections }, city)),

    remove: (lineId: number) => mutate((city) => api.removeItem(lineId, city)),

    applyCoupon: (code: string) => mutate((city) => api.applyCoupon(code, city)),

    removeCoupon: () => mutate((city) => api.removeCoupon(city)),

    /** Choose the delivery city; the bag is re-priced with its fee. */
    async setCity(cityId: number | null): Promise<void> {
        try {
            if (cityId === null) {
                localStorage.removeItem(CITY_KEY);
            } else {
                localStorage.setItem(CITY_KEY, String(cityId));
            }
        } catch {
            // Not persisted; still applied for this visit.
        }

        cartStore.setState({ cityId });

        if (getCartToken() !== null) {
            await enqueue(async () => receive(await api.cart(cityId)));
        }
    },

    /** The cart became an order: start afresh. */
    clear(): void {
        setCartToken(null);
        cartStore.setState({ cart: null, loading: false });
    },
};

export function useCart<T>(selector: (state: CartState) => T): T {
    return useStore(cartStore, selector);
}
