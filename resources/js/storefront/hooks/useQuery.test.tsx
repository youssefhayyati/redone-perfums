import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@shared/http';
import { invalidateQueries, useQuery, type QueryResult } from './useQuery';

// React's act() environment flag for a bare createRoot test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<T>(hook: () => T) {
    const result: { current: T | undefined } = { current: undefined };
    const container = document.createElement('div');
    const root = createRoot(container);

    function Probe(): ReactNode {
        result.current = hook();

        return null;
    }

    return {
        result,
        render: () => act(() => root.render(<Probe />)),
        unmount: () => act(() => root.unmount()),
    };
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

afterEach(() => invalidateQueries(''));

describe('useQuery', () => {
    it('loads, then serves the cache without refetching while fresh', async () => {
        const fetcher = vi.fn().mockResolvedValue(['a']);
        const first = renderHook(() => useQuery('list', fetcher));
        await first.render();
        await flush();
        expect((first.result.current as QueryResult<string[]>).data).toEqual(['a']);
        await first.unmount();

        const second = renderHook(() => useQuery('list', fetcher));
        await second.render();

        expect((second.result.current as QueryResult<string[]>).data).toEqual(['a']);
        expect(fetcher).toHaveBeenCalledTimes(1);
        await second.unmount();
    });

    it('refetches after the cache is invalidated', async () => {
        const fetcher = vi.fn().mockResolvedValueOnce(['old']).mockResolvedValueOnce(['new']);
        const first = renderHook(() => useQuery('account-orders:1', fetcher));
        await first.render();
        await flush();
        await first.unmount();

        invalidateQueries('account-');
        const second = renderHook(() => useQuery('account-orders:1', fetcher));
        await second.render();
        await flush();

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect((second.result.current as QueryResult<string[]>).data).toEqual(['new']);
        await second.unmount();
    });

    it('exposes API errors', async () => {
        const fetcher = vi.fn().mockRejectedValue(new ApiError(404, 'Contenu introuvable.'));
        const view = renderHook(() => useQuery('missing', fetcher));
        await view.render();
        await flush();

        const state = view.result.current as QueryResult<unknown>;
        expect(state.error?.isNotFound).toBe(true);
        expect(state.loading).toBe(false);
        await view.unmount();
    });

    it('does nothing for a null key', async () => {
        const fetcher = vi.fn();
        const view = renderHook(() => useQuery(null, fetcher));
        await view.render();
        await flush();

        expect(fetcher).not.toHaveBeenCalled();
        expect((view.result.current as QueryResult<unknown>).loading).toBe(false);
        await view.unmount();
    });
});
