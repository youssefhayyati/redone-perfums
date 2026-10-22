/**
 * Checkout helpers: the form draft survives a reload, and each cart gets one
 * idempotency key so a retried submission returns the same order instead of a
 * second one.
 */
export interface CheckoutForm {
    customer_name: string;
    phone: string;
    email: string;
    address: string;
    delivery_notes: string;
    payment_method: string;
}

const DRAFT_KEY = 'rp-checkout-draft';

function session(): Storage | null {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

export function loadDraft(): Partial<CheckoutForm> {
    try {
        return JSON.parse(session()?.getItem(DRAFT_KEY) ?? '{}') as Partial<CheckoutForm>;
    } catch {
        return {};
    }
}

export function saveDraft(form: CheckoutForm): void {
    session()?.setItem(DRAFT_KEY, JSON.stringify(form));
}

export function clearDraft(): void {
    session()?.removeItem(DRAFT_KEY);
}

export function idempotencyKey(cartToken: string): string {
    const storageKey = `rp-checkout-key:${cartToken}`;
    const existing = session()?.getItem(storageKey);

    if (existing) {
        return existing;
    }

    const key = crypto.randomUUID();
    session()?.setItem(storageKey, key);

    return key;
}

export function forgetIdempotencyKey(cartToken: string): void {
    session()?.removeItem(`rp-checkout-key:${cartToken}`);
}

export function rememberOrderToken(reference: string, token: string): void {
    session()?.setItem(`rp-order:${reference}`, token);
}

export function orderToken(reference: string): string | null {
    return session()?.getItem(`rp-order:${reference}`) ?? null;
}
