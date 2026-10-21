/**
 * URL identifier preview, close to Laravel's Str::slug (used by the API when the
 * slug is left empty): accents are transliterated, apostrophes dropped, anything
 * else that is not a letter or digit becomes a single hyphen.
 */
const LIGATURES: Record<string, string> = { œ: 'oe', Œ: 'oe', æ: 'ae', Æ: 'ae', ß: 'ss', ø: 'o', Ø: 'o', đ: 'd', ł: 'l' };

export function slugify(input: string): string {
    return input
        .replace(/[œŒæÆßøØđł]/g, (char) => LIGATURES[char] ?? char)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’‘`´]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
    return SLUG_PATTERN.test(value);
}
