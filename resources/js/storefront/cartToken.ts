/**
 * The server-issued cart token (a UUID) identifies the visitor's cart through the
 * X-Cart-Token header. It is kept in localStorage so the bag survives reloads.
 */
const STORAGE_KEY = 'rp-cart';

let memory: string | null = null;

export function getCartToken(): string | null {
    if (memory !== null) {
        return memory;
    }

    try {
        memory = localStorage.getItem(STORAGE_KEY);
    } catch {
        memory = null;
    }

    return memory;
}

export function setCartToken(token: string | null): void {
    memory = token;

    try {
        if (token) {
            localStorage.setItem(STORAGE_KEY, token);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Storage unavailable: the token lives in memory for this visit.
    }
}
