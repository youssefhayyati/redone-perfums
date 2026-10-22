import { formatMoney, parseDirhams, toDirhamsInput } from '@shared/money';
import { isoToLocalInput, localInputToApi } from '../../lib/datetime';
import type { FieldErrors } from '../../lib/errors';
import type { Tone } from '../../lib/status';
import type { AdminCoupon, CouponPayload, CouponType } from '../../types';
import { parseInteger } from '../products/productForm';

/**
 * Coupon form ↔ payload. A percent coupon's value is a whole percentage (1–90); a
 * fixed coupon's value and every minimum amount are typed in DH and sent in centimes.
 */
export interface CouponForm {
    code: string;
    description: string;
    type: CouponType;
    percent: string;
    amount: string;
    min_subtotal: string;
    max_uses: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
}

export const COUPON_CODE_PATTERN = /^[A-Za-z0-9\-_]+$/;

export function emptyCouponForm(): CouponForm {
    return { code: '', description: '', type: 'percent', percent: '', amount: '', min_subtotal: '', max_uses: '', starts_at: '', ends_at: '', is_active: true };
}

export function couponToForm(coupon: AdminCoupon): CouponForm {
    return {
        code: coupon.code,
        description: coupon.description ?? '',
        type: coupon.type,
        percent: coupon.type === 'percent' ? String(coupon.value) : '',
        amount: coupon.type === 'fixed' ? toDirhamsInput(coupon.value) : '',
        min_subtotal: toDirhamsInput(coupon.min_subtotal),
        max_uses: coupon.max_uses === null ? '' : String(coupon.max_uses),
        starts_at: isoToLocalInput(coupon.starts_at),
        ends_at: isoToLocalInput(coupon.ends_at),
        is_active: coupon.is_active,
    };
}

export function couponFormToPayload(form: CouponForm): { payload: CouponPayload; errors: FieldErrors } {
    const errors: FieldErrors = {};
    const code = form.code.trim().toUpperCase();

    if (code === '') {
        errors.code = 'Indiquez un code.';
    } else if (!COUPON_CODE_PATTERN.test(code)) {
        errors.code = 'Lettres, chiffres, « - » ou « _ » uniquement, sans espace.';
    }

    let value: number | null;
    if (form.type === 'percent') {
        value = parseInteger(form.percent);
        if (value === null || value < 1 || value > 90) {
            errors.value = 'Pourcentage entier de 1 à 90.';
        }
    } else {
        value = parseDirhams(form.amount);
        if (value === null || value < 1) {
            errors.value = form.amount.trim() === '' ? 'Indiquez le montant de la remise.' : 'Montant invalide (ex. 50 ou 49,90).';
        }
    }

    const minSubtotal = form.min_subtotal.trim() === '' ? null : parseDirhams(form.min_subtotal);
    if (form.min_subtotal.trim() !== '' && minSubtotal === null) {
        errors.min_subtotal = 'Montant invalide (ex. 500).';
    }

    const maxUses = form.max_uses.trim() === '' ? null : parseInteger(form.max_uses);
    if (form.max_uses.trim() !== '' && (maxUses === null || maxUses < 1)) {
        errors.max_uses = 'Nombre entier, 1 ou plus.';
    }

    const startsAt = localInputToApi(form.starts_at);
    const endsAt = localInputToApi(form.ends_at);
    if (startsAt && endsAt && endsAt <= startsAt) {
        errors.ends_at = 'La fin doit être postérieure au début.';
    }

    return {
        payload: {
            code,
            description: form.description.trim() === '' ? null : form.description.trim(),
            type: form.type,
            value: value ?? 0,
            min_subtotal: minSubtotal,
            max_uses: maxUses,
            starts_at: startsAt,
            ends_at: endsAt,
            is_active: form.is_active,
        },
        errors,
    };
}

/** "-15 %" or "-50 DH". */
export function describeCouponValue(coupon: Pick<AdminCoupon, 'type' | 'value'>): string {
    return coupon.type === 'percent' ? `−${coupon.value} %` : `−${formatMoney(coupon.value)}`;
}

/** Why a coupon is or is not usable right now, for the status badge. */
export function couponState(coupon: AdminCoupon, now: Date = new Date()): { label: string; tone: Tone } {
    if (!coupon.is_active) {
        return { label: 'Désactivé', tone: 'muted' };
    }
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return { label: 'Programmé', tone: 'accent' };
    }
    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
        return { label: 'Expiré', tone: 'neutral' };
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return { label: 'Épuisé', tone: 'warning' };
    }

    return coupon.is_currently_valid ? { label: 'Valide', tone: 'success' } : { label: 'Inutilisable', tone: 'warning' };
}
