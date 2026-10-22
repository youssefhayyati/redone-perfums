import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isAbortError } from '@shared/http';
import { t } from '../i18n';

/**
 * Read-only data loading with a small in-memory cache: cached data renders at once
 * (stale-while-revalidate), responses for an outdated key are ignored and requests
 * are aborted on unmount. Mutations go through the stores, not through here.
 */

interface CacheEntry {
    data: unknown;
    at: number;
}

const cache = new Map<string, CacheEntry>();

export interface QueryOptions {
    /** Cached data younger than this is not refetched (ms). */
    staleTime?: number;
    /** Keep showing the previous key's data while the next one loads (filters, pagination). */
    keepPrevious?: boolean;
}

export interface QueryResult<T> {
    data: T | undefined;
    error: ApiError | undefined;
    /** No data to show yet for the current key. */
    loading: boolean;
    /** A request is in flight (possibly behind cached or previous data). */
    fetching: boolean;
    refetch: () => void;
}

interface State<T> {
    key: string | null;
    data: T | undefined;
    error: ApiError | undefined;
    fetching: boolean;
}

function toApiError(error: unknown): ApiError {
    return error instanceof ApiError ? error : new ApiError(500, t('Une erreur est survenue. Réessayez dans un instant.'));
}

export function invalidateQueries(prefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
}

export function useQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, options: QueryOptions = {}): QueryResult<T> {
    const { staleTime = 60_000, keepPrevious = false } = options;
    const fetcherRef = useRef(fetcher);
    const [reloads, setReloads] = useState(0);
    const [state, setState] = useState<State<T>>(() => ({
        key,
        data: key ? (cache.get(key)?.data as T | undefined) : undefined,
        error: undefined,
        fetching: false,
    }));

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        if (key === null) {
            setState({ key, data: undefined, error: undefined, fetching: false });

            return;
        }

        const entry = cache.get(key);
        const isFresh = entry !== undefined && reloads === 0 && Date.now() - entry.at < staleTime;

        setState((previous) => ({
            key,
            data: (entry?.data as T | undefined) ?? (keepPrevious ? previous.data : undefined),
            error: undefined,
            fetching: !isFresh,
        }));

        if (isFresh) {
            return;
        }

        const controller = new AbortController();

        fetcherRef.current(controller.signal).then(
            (data) => {
                cache.set(key, { data, at: Date.now() });
                if (!controller.signal.aborted) {
                    setState({ key, data, error: undefined, fetching: false });
                }
            },
            (error: unknown) => {
                if (controller.signal.aborted || isAbortError(error)) {
                    return;
                }
                setState((previous) => ({
                    key,
                    data: previous.key === key ? previous.data : undefined,
                    error: toApiError(error),
                    fetching: false,
                }));
            },
        );

        return () => controller.abort();
    }, [key, reloads, staleTime, keepPrevious]);

    const refetch = useCallback(() => setReloads((count) => count + 1), []);

    // During the render that follows a key change, never show another key's data
    // unless explicitly asked to.
    if (state.key !== key) {
        const cached = key ? (cache.get(key)?.data as T | undefined) : undefined;
        const data = cached ?? (keepPrevious ? state.data : undefined);

        return { data, error: undefined, loading: data === undefined && key !== null, fetching: key !== null, refetch };
    }

    return {
        data: state.data,
        error: state.error,
        loading: state.data === undefined && state.error === undefined && key !== null,
        fetching: state.fetching,
        refetch,
    };
}
