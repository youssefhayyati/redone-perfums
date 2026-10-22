/**
 * JSON client for the Laravel API. Requests are same-origin, so the session cookie
 * travels with them; mutating requests echo Laravel's XSRF-TOKEN cookie (Sanctum's
 * stateful SPA flow). Errors surface as ApiError with a user-presentable message in the
 * page's language and Laravel's per-field validation errors.
 */

import { getLocale, type Locale } from './locale';

type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>;

export type Query = Record<string, QueryValue>;

export type ValidationErrors = Record<string, string[]>;

export interface RequestOptions {
    query?: Query;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export class ApiError extends Error {
    readonly status: number;
    readonly errors: ValidationErrors;
    readonly data: unknown;

    constructor(status: number, message: string, errors: ValidationErrors = {}, data: unknown = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.data = data;
    }

    get isValidation(): boolean {
        return this.status === 422;
    }

    get isNotFound(): boolean {
        return this.status === 404;
    }

    get isUnauthenticated(): boolean {
        return this.status === 401;
    }

    /** First message for a field, e.g. `error.field('email')`. */
    field(name: string): string | undefined {
        return this.errors[name]?.[0];
    }
}

const FALLBACK_MESSAGES: Record<Locale, Record<number, string>> = {
    fr: {
        0: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
        401: 'Veuillez vous connecter pour continuer.',
        403: 'Cette action ne vous est pas autorisée.',
        404: 'Contenu introuvable.',
        419: 'Votre session a expiré. Rechargez la page.',
        429: 'Trop de tentatives. Patientez un instant avant de réessayer.',
        500: 'Une erreur est survenue. Réessayez dans un instant.',
        400: 'La requête n’a pas pu aboutir.',
    },
    ar: {
        0: 'تعذّر الاتصال. تحقّق من شبكتك ثم حاول مجددًا.',
        401: 'يُرجى تسجيل الدخول للمتابعة.',
        403: 'هذا الإجراء غير مسموح لك.',
        404: 'المحتوى غير موجود.',
        419: 'انتهت صلاحية جلستك. أعد تحميل الصفحة.',
        429: 'محاولات كثيرة. انتظر قليلًا قبل إعادة المحاولة.',
        500: 'حدث خطأ. حاول مرة أخرى بعد لحظة.',
        400: 'تعذّر إتمام الطلب.',
    },
    en: {
        0: 'Unable to connect. Check your network and try again.',
        401: 'Please log in to continue.',
        403: 'You are not allowed to do this.',
        404: 'Content not found.',
        419: 'Your session has expired. Please reload the page.',
        429: 'Too many attempts. Please wait a moment before trying again.',
        500: 'Something went wrong. Please try again in a moment.',
        400: 'The request could not be completed.',
    },
};

/** Framework defaults that are English or expose internals; replaced by our own wording. */
const GENERIC_SERVER_MESSAGE =
    /^(Unauthenticated\.|This action is unauthorized\.|Not Found|Forbidden|Too Many Attempts\.|Server Error|CSRF token mismatch\.|No query results for model|Method Not Allowed|Service Unavailable|Page Expired)/;

export function errorMessage(status: number, serverMessage: unknown): string {
    if (typeof serverMessage === 'string' && serverMessage.trim() !== '' && !GENERIC_SERVER_MESSAGE.test(serverMessage)) {
        return serverMessage;
    }

    const messages = FALLBACK_MESSAGES[getLocale()];

    return messages[status] ?? (status >= 500 ? messages[500]! : messages[400]!);
}

export function readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const entry = document.cookie.split('; ').find((row) => row.startsWith(prefix));

    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

/** Empty values are dropped; arrays become comma lists (the API accepts `family=a,b`). */
export function buildQuery(query?: Query): string {
    if (!query) {
        return '';
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        if (Array.isArray(value)) {
            if (value.length > 0) {
                params.set(key, value.join(','));
            }
            continue;
        }

        params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }

    const serialized = params.toString();

    return serialized === '' ? '' : `?${serialized}`;
}

export interface HttpClient {
    get<T>(path: string, options?: RequestOptions): Promise<T>;
    post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
}

export interface HttpConfig {
    baseUrl: string;
    /** Extra headers resolved per request (e.g. the cart token). Empty values are skipped. */
    headers?: () => Record<string, string | null | undefined>;
}

export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export function createHttp(config: HttpConfig): HttpClient {
    async function request<T>(method: string, path: string, body: unknown, options: RequestOptions = {}, retried = false): Promise<T> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        for (const [name, value] of Object.entries(config.headers?.() ?? {})) {
            if (value) {
                headers[name] = value;
            }
        }

        Object.assign(headers, options.headers);

        let payload: BodyInit | undefined;
        if (body instanceof FormData) {
            payload = body;
        } else if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }

        if (method !== 'GET') {
            const xsrf = readCookie('XSRF-TOKEN');
            if (xsrf) {
                headers['X-XSRF-TOKEN'] = xsrf;
            }
        }

        let response: Response;
        try {
            response = await fetch(config.baseUrl + path + buildQuery(options.query), {
                method,
                headers,
                body: payload,
                credentials: 'same-origin',
                signal: options.signal,
            });
        } catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            throw new ApiError(0, errorMessage(0, null));
        }

        // Expired CSRF token: fetch a fresh cookie once, then replay the request.
        if (response.status === 419 && !retried) {
            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).catch(() => undefined);

            return request<T>(method, path, body, options, true);
        }

        const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);

        if (!response.ok) {
            const problem = (data ?? {}) as { message?: unknown; errors?: ValidationErrors };
            throw new ApiError(response.status, errorMessage(response.status, problem.message), problem.errors ?? {}, data);
        }

        return data as T;
    }

    return {
        get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
        post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
        put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
        patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
        delete: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('DELETE', path, body, options),
    };
}
