import type { Query } from '@shared/http';

/**
 * List screens keep their filters and page in the URL, so a filtered view can be
 * reloaded, shared or reached again with the back button. `defaults` both types the
 * filters and decides how each raw string is parsed; values equal to their default
 * are left out of the URL.
 */
export type ParamValue = string | number | boolean;
export type ParamValues = Record<string, ParamValue>;
export type AllowedValues<T extends ParamValues> = Partial<Record<keyof T, readonly string[]>>;

export function readParams<T extends ParamValues>(params: URLSearchParams, defaults: T, allowed: AllowedValues<T> = {}): T {
    const values: ParamValues = {};

    for (const [key, fallback] of Object.entries(defaults)) {
        const raw = params.get(key);

        if (raw === null) {
            values[key] = fallback;
            continue;
        }

        if (typeof fallback === 'number') {
            const parsed = Number.parseInt(raw, 10);
            values[key] = Number.isFinite(parsed) && parsed >= 1 && String(parsed) === raw.trim() ? parsed : fallback;
        } else if (typeof fallback === 'boolean') {
            values[key] = raw === '1' || raw === 'true';
        } else {
            const list = allowed[key as keyof T];
            const value = raw.trim();
            values[key] = list && !list.includes(value) ? fallback : value;
        }
    }

    return values as T;
}

export function writeParams<T extends ParamValues>(values: T, defaults: T): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, fallback] of Object.entries(defaults)) {
        const value = values[key];

        if (value === undefined || value === fallback) {
            continue;
        }

        if (typeof value === 'boolean') {
            if (value) {
                params.set(key, '1');
            }
        } else if (typeof value === 'number') {
            params.set(key, String(value));
        } else if (value.trim() !== '') {
            params.set(key, value.trim());
        }
    }

    return params;
}

/**
 * Filters as API query parameters: empty strings and false flags are dropped so the
 * backend applies no filter for them.
 */
export function toApiQuery(values: ParamValues, rename: Record<string, string> = {}): Query {
    const query: Query = {};

    for (const [key, value] of Object.entries(values)) {
        if (value === '' || value === false) {
            continue;
        }
        query[rename[key] ?? key] = value;
    }

    return query;
}

/** Applies a filter change; any change other than the page itself goes back to page 1. */
export function mergeParams<T extends ParamValues>(current: T, patch: Partial<T>, defaults: T): T {
    const next = { ...current, ...patch };

    if ('page' in defaults && !('page' in patch)) {
        (next as ParamValues).page = defaults.page as ParamValue;
    }

    return next;
}
