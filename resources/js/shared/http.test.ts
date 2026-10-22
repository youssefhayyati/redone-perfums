import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, createHttp, errorMessage } from './http';

function jsonResponse(status: number, body: unknown): Response {
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('buildQuery', () => {
    it('drops empty values and joins lists with commas', () => {
        expect(buildQuery({ q: 'rose', page: 2, family: ['ambre', 'boise'], size: [], empty: '', none: null, missing: undefined, flag: true })).toBe(
            '?q=rose&page=2&family=ambre%2Cboise&flag=1',
        );
    });

    it('returns an empty string when nothing remains', () => {
        expect(buildQuery({ q: '' })).toBe('');
        expect(buildQuery()).toBe('');
    });
});

describe('errorMessage', () => {
    it('keeps the server message when it is meant for people', () => {
        expect(errorMessage(422, 'Ce code a expiré.')).toBe('Ce code a expiré.');
    });

    it.each([
        [404, 'No query results for model [App\\Models\\Product].', 'Contenu introuvable.'],
        [401, 'Unauthenticated.', 'Veuillez vous connecter pour continuer.'],
        [429, 'Too Many Attempts.', 'Trop de tentatives. Patientez un instant avant de réessayer.'],
        [503, 'Service Unavailable', 'Une erreur est survenue. Réessayez dans un instant.'],
    ])('replaces the framework default for %i', (status, server, expected) => {
        expect(errorMessage(status, server)).toBe(expected);
    });
});

describe('createHttp', () => {
    it('sends JSON with the XSRF token and extra headers on mutating requests', async () => {
        document.cookie = `XSRF-TOKEN=${encodeURIComponent('abc=123')}`;
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
        vi.stubGlobal('fetch', fetchMock);
        const http = createHttp({ baseUrl: '/api', headers: () => ({ 'X-Cart-Token': 'token-1', 'X-Empty': null }) });

        const result = await http.post<{ ok: boolean }>('/cart/items', { variant_id: 4 });

        expect(result).toEqual({ ok: true });
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/cart/items');
        expect(init.method).toBe('POST');
        expect(init.body).toBe('{"variant_id":4}');
        expect(init.credentials).toBe('same-origin');
        expect(init.headers).toMatchObject({ 'X-XSRF-TOKEN': 'abc=123', 'X-Cart-Token': 'token-1', 'Content-Type': 'application/json' });
        expect(init.headers).not.toHaveProperty('X-Empty');
    });

    it('does not send the XSRF token on GET requests', async () => {
        document.cookie = 'XSRF-TOKEN=abc';
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
        vi.stubGlobal('fetch', fetchMock);

        await createHttp({ baseUrl: '/api' }).get('/products', { query: { q: 'oud' } });

        expect(fetchMock.mock.calls[0]![0]).toBe('/api/products?q=oud');
        expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty('X-XSRF-TOKEN');
    });

    it('turns a 422 into an ApiError carrying the field errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { message: 'Le champ e-mail est obligatoire.', errors: { email: ['Le champ e-mail est obligatoire.'] } })));

        const error = await createHttp({ baseUrl: '/api' }).post('/newsletter', {}).catch((failure: unknown) => failure);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isValidation).toBe(true);
        expect((error as ApiError).field('email')).toBe('Le champ e-mail est obligatoire.');
    });

    it('refreshes the CSRF cookie once and replays the request after a 419', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(419, { message: 'CSRF token mismatch.' }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(jsonResponse(200, { saved: true }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await createHttp({ baseUrl: '/api' }).put('/account/profile', { name: 'Salma' });

        expect(result).toEqual({ saved: true });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[1]![0]).toBe('/sanctum/csrf-cookie');
    });

    it('reports a network failure as status 0 with a French message', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

        const error = (await createHttp({ baseUrl: '/api' }).get('/home').catch((failure: unknown) => failure)) as ApiError;

        expect(error.status).toBe(0);
        expect(error.message).toBe('Connexion impossible. Vérifiez votre réseau puis réessayez.');
    });

    it('lets aborts through untouched', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

        await expect(createHttp({ baseUrl: '/api' }).get('/home')).rejects.toMatchObject({ name: 'AbortError' });
    });
});
