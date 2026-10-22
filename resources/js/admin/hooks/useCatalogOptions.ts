import { useEffect, useState } from 'react';
import { ApiError } from '@shared/http';
import * as api from '../api';
import type { CatalogOptions } from '../types';
import { toApiError } from './useApiQuery';

/**
 * Reference data shared by the product, collection and pack forms (families,
 * collections, notes, sizes, products with variants). Fetched once and reused until
 * a catalog mutation invalidates it.
 */
let cached: CatalogOptions | null = null;
let inflight: Promise<CatalogOptions> | null = null;

export function invalidateCatalogOptions(): void {
    cached = null;
}

function fetchOptions(): Promise<CatalogOptions> {
    inflight ??= api.products
        .options()
        .then((options) => {
            cached = options;

            return options;
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}

export function useCatalogOptions(): { options: CatalogOptions | null; error: ApiError | null; reload: () => void } {
    const [options, setOptions] = useState<CatalogOptions | null>(cached);
    const [error, setError] = useState<ApiError | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;

        if (cached && attempt === 0) {
            setOptions(cached);

            return;
        }

        setError(null);
        fetchOptions().then(
            (result) => active && setOptions(result),
            (failure: unknown) => active && setError(toApiError(failure)),
        );

        return () => {
            active = false;
        };
    }, [attempt]);

    return {
        options,
        error,
        reload: () => {
            invalidateCatalogOptions();
            setAttempt((count) => count + 1);
        },
    };
}
