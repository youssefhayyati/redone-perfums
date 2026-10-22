import { useSyncExternalStore } from 'react';

/**
 * A tiny observable store for app-wide state (cart, session, UI), read from React
 * with useSyncExternalStore so updates never tear between components.
 */
export interface Store<S> {
    getState(): S;
    setState(update: Partial<S> | ((state: S) => Partial<S>)): void;
    subscribe(listener: () => void): () => void;
}

export function createStore<S extends object>(initial: S): Store<S> {
    let state = initial;
    const listeners = new Set<() => void>();

    return {
        getState: () => state,
        setState(update) {
            const patch = typeof update === 'function' ? update(state) : update;
            state = { ...state, ...patch };
            listeners.forEach((listener) => listener());
        },
        subscribe(listener) {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
    };
}

/**
 * Subscribe to a slice of a store. The selector must return a value already held in
 * the state (or a primitive) — building a new object on every call would re-render
 * forever.
 */
export function useStore<S, T>(store: Store<S>, selector: (state: S) => T): T {
    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()),
    );
}
