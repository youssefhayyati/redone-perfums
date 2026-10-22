import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isAbortError } from '@shared/http';

/**
 * Loads data for a screen. A new `key` aborts the previous request and ignores its
 * late answer. With `keepPrevious`, the last data stays on screen while the next key
 * loads (filters, pagination) so lists never flash empty.
 */
export interface ApiQuery<T> {
    data: T | undefined;
    error: ApiError | undefined;
    /** Nothing to show yet for this key. */
    loading: boolean;
    /** A request is in flight, possibly behind previous data. */
    fetching: boolean;
    reload: () => void;
    /** Local update after a mutation, without refetching. */
    setData: (update: T | ((current: T | undefined) => T | undefined)) => void;
}

interface State<T> {
    key: string | null;
    data: T | undefined;
    error: ApiError | undefined;
    fetching: boolean;
}

export function toApiError(error: unknown): ApiError {
    return error instanceof ApiError ? error : new ApiError(500, 'Une erreur est survenue. Réessayez dans un instant.');
}

export function useApiQuery<T>(
    key: string | null,
    fetcher: (signal: AbortSignal) => Promise<T>,
    { keepPrevious = false }: { keepPrevious?: boolean } = {},
): ApiQuery<T> {
    const fetcherRef = useRef(fetcher);
    const [reloads, setReloads] = useState(0);
    const [state, setState] = useState<State<T>>({ key, data: undefined, error: undefined, fetching: key !== null });

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        if (key === null) {
            setState({ key, data: undefined, error: undefined, fetching: false });

            return;
        }

        const controller = new AbortController();

        setState((previous) => ({
            key,
            data: previous.key === key || keepPrevious ? previous.data : undefined,
            error: undefined,
            fetching: true,
        }));

        fetcherRef.current(controller.signal).then(
            (data) => {
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
    }, [key, reloads, keepPrevious]);

    const reload = useCallback(() => setReloads((count) => count + 1), []);

    const setData = useCallback((update: T | ((current: T | undefined) => T | undefined)) => {
        setState((previous) => ({
            ...previous,
            data: typeof update === 'function' ? (update as (current: T | undefined) => T | undefined)(previous.data) : update,
        }));
    }, []);

    // On the render right after a key change, never show another key's data unless asked.
    if (state.key !== key) {
        const data = keepPrevious ? state.data : undefined;

        return { data, error: undefined, loading: data === undefined && key !== null, fetching: key !== null, reload, setData };
    }

    return {
        data: state.data,
        error: state.error,
        loading: state.data === undefined && state.error === undefined && key !== null,
        fetching: state.fetching,
        reload,
        setData,
    };
}
