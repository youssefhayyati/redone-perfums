import { createHttp, type Query } from '@shared/http';
import { getLocale } from '@shared/locale';
import type {
    Cart,
    City,
    Collection,
    ContentPage,
    Customer,
    Facets,
    Family,
    HomePayload,
    Order,
    Pack,
    PackOption,
    PackQuote,
    Paginated,
    Product,
    ProductCard,
    StorefrontConfig,
} from '@shared/types';
import { getCartToken } from './cartToken';

export const http = createHttp({
    baseUrl: '/api',
    // The API answers in the page's language (see app/Http/Middleware/SetLocale.php).
    headers: () => ({ 'X-Cart-Token': getCartToken(), 'X-Locale': getLocale() }),
});

export interface CheckoutPayload {
    customer_name: string;
    phone: string;
    email: string | null;
    city_id: number;
    address: string;
    delivery_notes: string | null;
    payment_method: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    phone: string | null;
    password: string;
    password_confirmation: string;
}

type Opts = { signal?: AbortSignal };

/** Typed storefront endpoints (routes/api.php). */
export const api = {
    config: (o?: Opts) => http.get<StorefrontConfig>('/storefront', o),
    home: (o?: Opts) => http.get<HomePayload>('/home', o),

    products: (query: Query, o?: Opts) => http.get<Paginated<ProductCard> & { sort: string }>('/products', { ...o, query }),
    facets: (o?: Opts) => http.get<Facets>('/products/facets', o),
    product: (slug: string, o?: Opts) => http.get<{ data: Product; related: ProductCard[] }>(`/products/${encodeURIComponent(slug)}`, o),

    collections: (o?: Opts) => http.get<{ data: Collection[] }>('/collections', o),
    collection: (slug: string, o?: Opts) => http.get<{ data: Collection }>(`/collections/${encodeURIComponent(slug)}`, o),
    families: (o?: Opts) => http.get<{ data: Family[] }>('/families', o),

    packs: (o?: Opts) => http.get<{ data: Pack[] }>('/packs', o),
    pack: (slug: string, o?: Opts) => http.get<{ data: Pack; options: PackOption[] }>(`/packs/${encodeURIComponent(slug)}`, o),
    quotePack: (slug: string, selections: number[], o?: Opts) =>
        http.post<PackQuote>(`/packs/${encodeURIComponent(slug)}/quote`, { selections }, o),

    page: (slug: string, o?: Opts) => http.get<{ data: ContentPage }>(`/pages/${encodeURIComponent(slug)}`, o),
    cities: (o?: Opts) => http.get<{ data: City[] }>('/delivery/cities', o),

    cart: (cityId: number | null) => http.get<Cart>('/cart', { query: { city_id: cityId } }),
    addItem: (variantId: number, quantity: number, cityId: number | null) =>
        http.post<Cart>('/cart/items', { variant_id: variantId, quantity, city_id: cityId }),
    addPack: (packId: number, selections: number[], quantity: number, cityId: number | null) =>
        http.post<Cart>('/cart/packs', { pack_id: packId, selections, quantity, city_id: cityId }),
    updateItem: (lineId: number, changes: { quantity?: number; selections?: number[] }, cityId: number | null) =>
        http.patch<Cart>(`/cart/items/${lineId}`, { ...changes, city_id: cityId }),
    removeItem: (lineId: number, cityId: number | null) => http.delete<Cart>(`/cart/items/${lineId}`, undefined, { query: { city_id: cityId } }),
    applyCoupon: (code: string, cityId: number | null) => http.post<Cart>('/cart/coupon', { code, city_id: cityId }),
    removeCoupon: (cityId: number | null) => http.delete<Cart>('/cart/coupon', undefined, { query: { city_id: cityId } }),

    checkout: (payload: CheckoutPayload, idempotencyKey: string) =>
        http.post<{ order: Order; access_token: string }>('/checkout', payload, { headers: { 'Idempotency-Key': idempotencyKey } }),
    order: (reference: string, token: string | null, o?: Opts) =>
        http.get<{ data: Order }>(`/orders/${encodeURIComponent(reference)}`, { ...o, query: { token } }),

    subscribe: (email: string, source: string) => http.post<{ message: string }>('/newsletter', { email, consent: true, source }),

    me: () => http.get<{ user: Customer | null }>('/auth/me'),
    login: (email: string, password: string, remember: boolean) =>
        http.post<{ user: Customer }>('/auth/login', { email, password, remember }),
    register: (payload: RegisterPayload) => http.post<{ user: Customer }>('/auth/register', payload),
    logout: () => http.post<{ message: string }>('/auth/logout'),
    forgotPassword: (email: string) => http.post<{ message: string }>('/auth/forgot-password', { email }),
    resetPassword: (payload: { token: string; email: string; password: string; password_confirmation: string }) =>
        http.post<{ message: string }>('/auth/reset-password', payload),

    accountOrders: (page: number, o?: Opts) => http.get<Paginated<Order>>('/account/orders', { ...o, query: { page } }),
    accountOrder: (reference: string, o?: Opts) => http.get<{ data: Order }>(`/account/orders/${encodeURIComponent(reference)}`, o),
    updateProfile: (payload: { name: string; phone: string | null }) => http.put<{ user: Customer }>('/account/profile', payload),
    updatePassword: (payload: { current_password: string; password: string; password_confirmation: string }) =>
        http.put<{ message: string }>('/account/password', payload),
};
