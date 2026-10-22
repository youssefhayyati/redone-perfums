/**
 * Moroccan phone numbers, mirroring App\Support\MoroccanPhone so the form can guide
 * the customer before the server validates: 0X XX XX XX XX, +212 X…, 00212 X…,
 * where X is 5 (landline), 6 or 7 (mobile).
 */

const PATTERN = /^(?:\+212|00212|212|0)([567]\d{8})$/;

/** Returns the E.164 form (+212612345678) or null when the number is not Moroccan. */
export function normalizeMoroccanPhone(input: string): string | null {
    const digits = input.trim().replace(/[\s\-.()]/g, '');
    const match = PATTERN.exec(digits);

    return match ? `+212${match[1]}` : null;
}

export function isValidMoroccanPhone(input: string): boolean {
    return normalizeMoroccanPhone(input) !== null;
}

/** "+212612345678" or "0612345678" → "06 12 34 56 78"; other input is returned as typed. */
export function formatMoroccanPhone(input: string): string {
    const e164 = normalizeMoroccanPhone(input);

    if (e164 === null) {
        return input;
    }

    return `0${e164.slice(4)}`.replace(/(\d{2})(?=\d)/g, '$1 ');
}
