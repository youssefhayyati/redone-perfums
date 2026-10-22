import { afterEach, describe, expect, it } from 'vitest';
import { forgetIdempotencyKey, idempotencyKey } from './checkout';

afterEach(() => sessionStorage.clear());

describe('idempotencyKey', () => {
    it('reuses the same key for retries of the same cart', () => {
        const first = idempotencyKey('cart-a');

        expect(idempotencyKey('cart-a')).toBe(first);
        expect(first).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('issues a different key per cart and a new one once forgotten', () => {
        const first = idempotencyKey('cart-a');

        expect(idempotencyKey('cart-b')).not.toBe(first);
        forgetIdempotencyKey('cart-a');
        expect(idempotencyKey('cart-a')).not.toBe(first);
    });
});
