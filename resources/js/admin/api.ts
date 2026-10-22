import { ApiError, createHttp, type Query } from '@shared/http';
import type {
    AdjustMode,
    AdminCity,
    AdminCollection,
    AdminCoupon,
    AdminCustomer,
    AdminCustomerDetail,
    AdminOrder,
    AdminPack,
    AdminPage,
    AdminProduct,
    AdminUser,
    CatalogOptions,
    CityPayload,
    CollectionPayload,
    CouponPayload,
    DashboardDays,
    DashboardPayload,
    DeliveryUpdate,
    DeliveryZone,
    Family,
    FamilyPayload,
    ImageAsset,
    InventoryList,
    InventoryMovement,
    InventoryRow,
    MemberUpdate,
    NewMemberPayload,
    NoteTranslation,
    OrderList,
    OrderStatus,
    PackPayload,
    PagePayload,
    Paged,
    PaymentStatus,
    ProductPayload,
    SettingsPayload,
    SettingValue,
    SubscriberList,
    TeamList,
    TeamMember,
    ZonePayload,
} from './types';

/**
 * Typed endpoints of the admin API (routes/api.php, prefix `admin`). Every request
 * that comes back 401 tells the session store, so an expired session sends the user
 * to the sign-in screen from wherever they are.
 */

const http = createHttp({ baseUrl: '/api/admin' });

let onUnauthenticated: (() => void) | null = null;

export function setUnauthenticatedHandler(handler: () => void): void {
    onUnauthenticated = handler;
}

async function guard<T>(request: Promise<T>): Promise<T> {
    try {
        return await request;
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            onUnauthenticated?.();
        }
        throw error;
    }
}

function get<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
    return guard(http.get<T>(path, { query, signal }));
}

function post<T>(path: string, body?: unknown): Promise<T> {
    return guard(http.post<T>(path, body));
}

function put<T>(path: string, body?: unknown): Promise<T> {
    return guard(http.put<T>(path, body));
}

function patch<T>(path: string, body?: unknown): Promise<T> {
    return guard(http.patch<T>(path, body));
}

function destroy<T = { message: string }>(path: string): Promise<T> {
    return guard(http.delete<T>(path));
}

type Data<T> = { data: T };

const unwrap = <T>(response: Data<T>): T => response.data;

function imageForm(file: File, extra: Record<string, string | null | undefined> = {}): FormData {
    const form = new FormData();
    form.append('image', file);
    for (const [key, value] of Object.entries(extra)) {
        if (value) {
            form.append(key, value);
        }
    }

    return form;
}

export const auth = {
    /** Unauthenticated requests are not reported to the handler here: they are expected. */
    me: (signal?: AbortSignal) => http.get<{ user: AdminUser }>('/me', { signal }).then((r) => r.user),
    login: (email: string, password: string, remember: boolean) =>
        http.post<{ user: AdminUser }>('/login', { email, password, remember }).then((r) => r.user),
    logout: () => http.post<{ message: string }>('/logout'),
};

export const dashboard = {
    get: (days: DashboardDays, signal?: AbortSignal) => get<DashboardPayload>('/dashboard', { days }, signal),
};

export const orders = {
    list: (query: Query, signal?: AbortSignal) => get<OrderList>('/orders', query, signal),
    show: (reference: string, signal?: AbortSignal) =>
        get<Data<AdminOrder>>(`/orders/${encodeURIComponent(reference)}`, undefined, signal).then(unwrap),
    updateStatus: (reference: string, status: OrderStatus, note: string | null) =>
        post<Data<AdminOrder>>(`/orders/${encodeURIComponent(reference)}/status`, { status, note }).then(unwrap),
    updatePayment: (reference: string, paymentStatus: PaymentStatus, note: string | null) =>
        post<Data<AdminOrder>>(`/orders/${encodeURIComponent(reference)}/payment`, { payment_status: paymentStatus, note }).then(unwrap),
    updateDelivery: (reference: string, changes: DeliveryUpdate) =>
        patch<Data<AdminOrder>>(`/orders/${encodeURIComponent(reference)}/delivery`, changes).then(unwrap),
    addNote: (reference: string, note: string) =>
        post<Data<AdminOrder>>(`/orders/${encodeURIComponent(reference)}/notes`, { note }).then(unwrap),
};

export const products = {
    list: (query: Query, signal?: AbortSignal) => get<Paged<AdminProduct>>('/products', query, signal),
    show: (id: number, signal?: AbortSignal) => get<Data<AdminProduct>>(`/products/${id}`, undefined, signal).then(unwrap),
    create: (payload: ProductPayload) => post<Data<AdminProduct>>('/products', payload).then(unwrap),
    update: (id: number, payload: ProductPayload) => put<Data<AdminProduct>>(`/products/${id}`, payload).then(unwrap),
    archive: (id: number) => destroy(`/products/${id}`),
    restore: (id: number) => post<Data<AdminProduct>>(`/products/${id}/restore`).then(unwrap),
    options: (signal?: AbortSignal) => get<CatalogOptions>('/catalog/options', undefined, signal),
    uploadImage: (id: number, file: File, alt: string | null) =>
        post<Data<ImageAsset>>(`/products/${id}/images`, imageForm(file, { alt })).then(unwrap),
    reorderImages: (id: number, ids: number[]) => put<Data<ImageAsset[]>>(`/products/${id}/images/order`, { ids }).then(unwrap),
    updateImage: (id: number, imageId: number, alt: string | null) =>
        patch<Data<ImageAsset>>(`/products/${id}/images/${imageId}`, { alt }).then(unwrap),
    deleteImage: (id: number, imageId: number) => destroy(`/products/${id}/images/${imageId}`),
};

export const notes = {
    search: (search: string, signal?: AbortSignal) => get<Data<string[]>>('/notes', { search }, signal).then(unwrap),
    translations: (signal?: AbortSignal) => get<Data<NoteTranslation[]>>('/notes/translations', undefined, signal).then(unwrap),
    translate: (id: number, nameAr: string | null) => put<Data<Omit<NoteTranslation, 'products_count'>>>(`/notes/${id}`, { name_ar: nameAr }).then(unwrap),
};

export const families = {
    list: (signal?: AbortSignal) => get<Data<Family[]>>('/families', undefined, signal).then(unwrap),
    create: (payload: FamilyPayload) => post<Data<Family>>('/families', payload).then(unwrap),
    update: (id: number, payload: FamilyPayload) => put<Data<Family>>(`/families/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/families/${id}`),
};

export const collections = {
    list: (signal?: AbortSignal) => get<Data<AdminCollection[]>>('/collections', undefined, signal).then(unwrap),
    show: (id: number, signal?: AbortSignal) => get<Data<AdminCollection>>(`/collections/${id}`, undefined, signal).then(unwrap),
    create: (payload: CollectionPayload) => post<Data<AdminCollection>>('/collections', payload).then(unwrap),
    update: (id: number, payload: CollectionPayload) => put<Data<AdminCollection>>(`/collections/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/collections/${id}`),
};

export const packs = {
    list: (signal?: AbortSignal) => get<Data<AdminPack[]>>('/packs', undefined, signal).then(unwrap),
    show: (id: number, signal?: AbortSignal) => get<Data<AdminPack>>(`/packs/${id}`, undefined, signal).then(unwrap),
    create: (payload: PackPayload) => post<Data<AdminPack>>('/packs', payload).then(unwrap),
    update: (id: number, payload: PackPayload) => put<Data<AdminPack>>(`/packs/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/packs/${id}`),
};

export const uploads = {
    image: (file: File, folder: 'collections' | 'packs') =>
        post<{ path: string; url: string }>('/uploads', imageForm(file, { folder })),
};

export const inventory = {
    list: (query: Query, signal?: AbortSignal) => get<InventoryList>('/inventory', query, signal),
    adjust: (variantId: number, mode: AdjustMode, quantity: number, note: string | null) =>
        post<Data<InventoryRow>>(`/inventory/${variantId}/adjust`, { mode, quantity, note }).then(unwrap),
    movements: (variantId: number, signal?: AbortSignal) =>
        get<Data<InventoryMovement[]>>(`/inventory/${variantId}/movements`, undefined, signal).then(unwrap),
};

export const customers = {
    list: (query: Query, signal?: AbortSignal) => get<Paged<AdminCustomer>>('/customers', query, signal),
    show: (id: number, signal?: AbortSignal) => get<Data<AdminCustomerDetail>>(`/customers/${id}`, undefined, signal).then(unwrap),
};

export const coupons = {
    list: (signal?: AbortSignal) => get<Data<AdminCoupon[]>>('/coupons', undefined, signal).then(unwrap),
    create: (payload: CouponPayload) => post<Data<AdminCoupon>>('/coupons', payload).then(unwrap),
    update: (id: number, payload: CouponPayload) => put<Data<AdminCoupon>>(`/coupons/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/coupons/${id}`),
};

export const pages = {
    list: (signal?: AbortSignal) => get<Data<AdminPage[]>>('/pages', undefined, signal).then(unwrap),
    create: (payload: PagePayload) => post<Data<AdminPage>>('/pages', payload).then(unwrap),
    update: (id: number, payload: PagePayload) => put<Data<AdminPage>>(`/pages/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/pages/${id}`),
};

export const newsletter = {
    list: (query: Query, signal?: AbortSignal) => get<SubscriberList>('/newsletter', query, signal),
};

export const zones = {
    list: (signal?: AbortSignal) => get<Data<DeliveryZone[]>>('/delivery-zones', undefined, signal).then(unwrap),
    create: (payload: ZonePayload) => post<Data<DeliveryZone>>('/delivery-zones', payload).then(unwrap),
    update: (id: number, payload: ZonePayload) => put<Data<DeliveryZone>>(`/delivery-zones/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/delivery-zones/${id}`),
};

export const cities = {
    list: (signal?: AbortSignal) => get<Data<AdminCity[]>>('/cities', undefined, signal).then(unwrap),
    create: (payload: CityPayload) => post<Data<AdminCity>>('/cities', payload).then(unwrap),
    update: (id: number, payload: CityPayload) => put<Data<AdminCity>>(`/cities/${id}`, payload).then(unwrap),
    remove: (id: number) => destroy(`/cities/${id}`),
};

export const settings = {
    show: (signal?: AbortSignal) => get<SettingsPayload>('/settings', undefined, signal),
    update: (values: Record<string, SettingValue>) => put<SettingsPayload>('/settings', { values }),
};

export const team = {
    list: (signal?: AbortSignal) => get<TeamList>('/team', undefined, signal),
    create: (payload: NewMemberPayload) => post<Data<TeamMember>>('/team', payload).then(unwrap),
    update: (id: number, changes: MemberUpdate) => put<Data<TeamMember>>(`/team/${id}`, changes).then(unwrap),
};
