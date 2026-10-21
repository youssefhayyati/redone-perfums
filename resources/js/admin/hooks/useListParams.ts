import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { mergeParams, readParams, writeParams, type AllowedValues, type ParamValues } from '../lib/query';

/**
 * Filters and page of a list screen, read from and written to the URL. Pass
 * module-level constants for `defaults` and `allowed`. Changing a filter goes back
 * to page 1; typing in a search box should use `{ replace: true }` so every
 * keystroke does not add a history entry.
 */
export function useListParams<T extends ParamValues>(
    defaults: T,
    allowed?: AllowedValues<T>,
): [T, (patch: Partial<T>, options?: { replace?: boolean }) => void, () => void] {
    const [searchParams, setSearchParams] = useSearchParams();

    const values = useMemo(() => readParams(searchParams, defaults, allowed), [searchParams, defaults, allowed]);

    const update = useCallback(
        (patch: Partial<T>, options: { replace?: boolean } = {}) => {
            setSearchParams(writeParams(mergeParams(values, patch, defaults), defaults), {
                replace: options.replace ?? false,
                preventScrollReset: true,
            });
        },
        [values, defaults, setSearchParams],
    );

    const reset = useCallback(() => setSearchParams(new URLSearchParams(), { preventScrollReset: true }), [setSearchParams]);

    return [values, update, reset];
}
