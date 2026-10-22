import { ApiError } from '@shared/http';
import { prefersReducedMotion } from './dom';

/** One message per field, keyed like Laravel (`name`, `variants.0.sku`, `notes.top.2`). */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: unknown): FieldErrors {
    if (!(error instanceof ApiError)) {
        return {};
    }

    const fields: FieldErrors = {};
    for (const [key, messages] of Object.entries(error.errors)) {
        if (messages[0]) {
            fields[key] = messages[0];
        }
    }

    return fields;
}

/** Errors nested under a prefix, with the prefix removed: `pickErrors(e, 'variants.0')`. */
export function pickErrors(errors: FieldErrors, prefix: string): FieldErrors {
    const picked: FieldErrors = {};
    const start = `${prefix}.`;

    for (const [key, message] of Object.entries(errors)) {
        if (key.startsWith(start)) {
            picked[key.slice(start.length)] = message;
        }
    }

    return picked;
}

/** First message for any of the keys, or for any key nested under them (`notes.top` → `notes.top.3`). */
export function firstError(errors: FieldErrors, ...keys: string[]): string | undefined {
    for (const key of keys) {
        if (errors[key]) {
            return errors[key];
        }
        const nested = Object.keys(errors).find((candidate) => candidate.startsWith(`${key}.`));
        if (nested) {
            return errors[nested];
        }
    }

    return undefined;
}

export function hasErrors(errors: FieldErrors): boolean {
    return Object.keys(errors).length > 0;
}

/** User-presentable message for any thrown value. */
export function errorText(error: unknown): string {
    if (error instanceof ApiError) {
        return error.message;
    }

    return 'Une erreur est survenue. Réessayez dans un instant.';
}

/**
 * Moves focus to the first invalid control after a failed submit, so keyboard and
 * screen-reader users land on the problem.
 */
export function focusFirstInvalid(root: ParentNode = document): void {
    window.requestAnimationFrame(() => {
        const field = root.querySelector<HTMLElement>('[aria-invalid="true"]');
        if (field) {
            field.focus({ preventScroll: true });
            field.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
    });
}
