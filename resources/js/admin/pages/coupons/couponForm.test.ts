import { describe, expect, it } from 'vitest';
import type { AdminCoupon } from '../../types';
import { couponFormToPayload, couponState, couponToForm, describeCouponValue, emptyCouponForm } from './couponForm';

const coupon: AdminCoupon = {
    id: 1,
    code: 'BIENVENUE',
    description: null,
    type: 'fixed',
    value: 5000,
    min_subtotal: 50000,
    max_uses: 100,
    used_count: 3,
    starts_at: null,
    ends_at: '2026-12-31T23:59:00+01:00',
    is_active: true,
    is_currently_valid: true,
};

describe('coupon form', () => {
    it('shows amounts in DH and round-trips them in centimes', () => {
        const form = couponToForm(coupon);
        expect(form.amount).toBe('50');
        expect(form.min_subtotal).toBe('500');
        expect(form.ends_at).toBe('2026-12-31T23:59');
        const { payload, errors } = couponFormToPayload(form);
        expect(errors).toEqual({});
        expect(payload).toMatchObject({ type: 'fixed', value: 5000, min_subtotal: 50000, max_uses: 100, ends_at: '2026-12-31T23:59:00', starts_at: null });
    });

    it('keeps percentages whole and validates their range', () => {
        const form = { ...emptyCouponForm(), code: ' ete-26 ', percent: '15' };
        expect(couponFormToPayload(form).payload).toMatchObject({ code: 'ETE-26', type: 'percent', value: 15, min_subtotal: null, max_uses: null });
        expect(couponFormToPayload({ ...form, percent: '91' }).errors.value).toBeDefined();
        expect(couponFormToPayload({ ...form, code: 'ÉTÉ 26' }).errors.code).toBeDefined();
    });

    it('checks the validity window order', () => {
        const form = { ...emptyCouponForm(), code: 'X', percent: '10', starts_at: '2026-11-02T10:00', ends_at: '2026-11-01T10:00' };
        expect(couponFormToPayload(form).errors.ends_at).toBeDefined();
    });
});

describe('coupon display', () => {
    it('describes value and state', () => {
        expect(describeCouponValue({ type: 'percent', value: 15 })).toBe('−15 %');
        const now = new Date('2026-11-01T00:00:00Z');
        expect(couponState(coupon, now)).toEqual({ label: 'Valide', tone: 'success' });
        expect(couponState({ ...coupon, is_active: false }, now).label).toBe('Désactivé');
        expect(couponState({ ...coupon, starts_at: '2026-12-01T00:00:00+01:00' }, now).label).toBe('Programmé');
        expect(couponState({ ...coupon, ends_at: '2026-10-01T00:00:00+01:00' }, now).label).toBe('Expiré');
        expect(couponState({ ...coupon, used_count: 100 }, now).label).toBe('Épuisé');
    });
});
