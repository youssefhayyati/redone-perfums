import { createStore, useStore } from '@shared/store';

/** Overlays are exclusive: opening one closes the others. */
export type Overlay = 'cart' | 'search' | 'menu' | null;

export interface Toast {
    id: number;
    tone: 'success' | 'error' | 'info';
    message: string;
}

interface UiState {
    overlay: Overlay;
    toasts: Toast[];
}

export const uiStore = createStore<UiState>({ overlay: null, toasts: [] });

let nextToastId = 1;

export const ui = {
    open: (overlay: Exclude<Overlay, null>) => uiStore.setState({ overlay }),
    close: () => uiStore.setState({ overlay: null }),
    toggle: (overlay: Exclude<Overlay, null>) =>
        uiStore.setState((state) => ({ overlay: state.overlay === overlay ? null : overlay })),
};

function push(tone: Toast['tone'], message: string): void {
    const id = nextToastId++;
    uiStore.setState((state) => ({ toasts: [...state.toasts.slice(-2), { id, tone, message }] }));
    window.setTimeout(() => dismissToast(id), tone === 'error' ? 6500 : 4000);
}

export function dismissToast(id: number): void {
    uiStore.setState((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
}

export const toast = {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
};

export function useUi<T>(selector: (state: UiState) => T): T {
    return useStore(uiStore, selector);
}
