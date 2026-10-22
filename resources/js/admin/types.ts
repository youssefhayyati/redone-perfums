/**
 * Shapes returned by the admin JSON API (app/Http/Controllers/Api/Admin and
 * app/Http/Resources/Admin). Money fields are integer centimes; dates are ISO 8601.
 */
import type { ImageAsset, NoteLayer, OrderStatus, PaymentStatus } from '@shared/types';

export type { ImageAsset, NoteLayer, OrderStatus, PaymentStatus };

export type Permission =
    | 'view-dashboard'
    | 'view-revenue'
    | 'manage-catalog'
    | 'manage-orders'
    | 'view-customers'
    | 'manage-promotions'
    | 'manage-content'
    | 'manage-settings'
    | 'manage-team';

export type StaffRole = 'admin' | 'manager' | 'support';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: StaffRole;
    role_label: string;
    permissions: Permission[];
}

/** Pagination block common to Laravel resources and the hand-built list endpoints. */
export interface ListMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
}

export interface Paged<T> {
    data: T[];
    meta: ListMeta;
}

/** Laravel serializes an empty keyed collection as `[]`. */
export type CountMap<K extends string> = Partial<Record<K, number>> | [];

export interface Option<V extends string = string> {
    value: V;
    label: string;
}

/* Dashboard ------------------------------------------------------------- */

export type DashboardDays = 7 | 30 | 90 | 365;

export interface DashboardPayload {
    range: { days: number; from: string; to: string };
    kpis: {
        revenue: number | null;
        revenue_previous: number | null;
        orders: number;
        orders_previous: number;
        average_order_value: number | null;
        average_order_value_previous: number | null;
        pending_orders: number;
        cancelled_orders: number;
    };
    trend: Array<{ date: string; revenue: number | null; orders: number }>;
    best_sellers: Array<{ product_id: number; name: string; units: number }>;
    status_breakdown: CountMap<OrderStatus>;
    low_stock: Array<{
        variant_id: number;
        product_id: number;
        product: string;
        label: string;
        sku: string;
        stock: number;
        threshold: number;
    }>;
    recent_orders: Array<{
        reference: string;
        customer_name: string;
        city: string;
        total: number | null;
        status: OrderStatus;
        placed_at: string;
    }>;
    setup: Array<{ key: string; label: string; done: boolean; link: string }>;
}

/* Orders ---------------------------------------------------------------- */

export interface AdminOrderSelection {
    position: number;
    product_id: number | null;
    product_name: string;
    size_ml: number;
    sku: string | null;
    unit_price: number;
}

export interface AdminOrderItem {
    id: number;
    type: 'product' | 'pack';
    name: string;
    variant_label: string | null;
    sku: string | null;
    product_id: number | null;
    pack_id: number | null;
    unit_price: number;
    compare_at_price: number | null;
    quantity: number;
    line_total: number;
    meta: Record<string, unknown> | null;
    selections: AdminOrderSelection[];
}

export type OrderEventType = 'status' | 'payment' | 'delivery' | 'note';

export interface AdminOrderEvent {
    id: number;
    type: OrderEventType | string;
    from: string | null;
    to: string | null;
    note: string | null;
    user: string | null;
    created_at: string;
}

/** A step of the homepage's "Le laboratoire" section. */
export interface AdminProcessStep {
    id: number;
    title: string;
    title_ar: string | null;
    body: string;
    body_ar: string | null;
    detail: string | null;
    detail_ar: string | null;
    image_path: string | null;
    image_url: string | null;
    /** Author and licence of a photo the store did not take. */
    image_credit: string | null;
    sort_order: number;
    is_visible: boolean;
    /** Still illustrated by a stock photo. */
    is_demo: boolean;
}

export type ProcessStepPayload = Pick<AdminProcessStep, 'title' | 'title_ar' | 'body' | 'body_ar' | 'detail' | 'detail_ar' | 'image_path' | 'image_credit' | 'is_visible'>;

/** Orders to print delivery slips for, with what the slip's header needs. */
export interface OrderSlips {
    data: AdminOrder[];
    store: { name: string; phone: string | null };
}

export interface AdminOrder {
    id: number;
    reference: string;
    status: OrderStatus;
    status_label: string;
    payment_method: string;
    payment_method_label: string;
    payment_status: PaymentStatus;
    payment_status_label: string;
    customer_name: string;
    phone: string;
    phone_e164: string;
    email: string | null;
    /** Language the customer ordered in, and to speak with them. */
    locale: 'fr' | 'ar';
    city_id: number | null;
    city: string;
    delivery_zone: string | null;
    address: string;
    delivery_notes: string | null;
    carrier: string | null;
    tracking_number: string | null;
    subtotal: number;
    discount_total: number;
    coupon_code: string | null;
    delivery_fee: number;
    total: number;
    items_count: number;
    admin_notes: string | null;
    placed_at: string;
    cancelled_at: string | null;
    delivered_at: string | null;
    customer?: { id: number; name: string; email: string } | null;
    allowed_transitions: Array<Option<OrderStatus>>;
    allowed_payment_transitions: Array<Option<PaymentStatus>>;
    items?: AdminOrderItem[];
    events?: AdminOrderEvent[];
}

export interface OrderList extends Paged<AdminOrder> {
    counts: CountMap<OrderStatus>;
}

export interface DeliveryUpdate {
    customer_name?: string;
    phone?: string;
    address?: string;
    delivery_notes?: string | null;
    carrier?: string | null;
    tracking_number?: string | null;
    admin_notes?: string | null;
}

/* Catalog --------------------------------------------------------------- */

export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductBadge = 'new' | 'bestseller' | 'limited';
export type Gender = 'feminin' | 'masculin' | 'mixte';
export type NotesByLayer = Record<NoteLayer, string[]>;

export interface AdminVariant {
    id: number;
    size_ml: number;
    sku: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    low_stock_threshold: number;
    is_active: boolean;
}

export interface AdminProduct {
    id: number;
    name: string;
    slug: string;
    status: ProductStatus;
    is_featured: boolean;
    is_demo: boolean;
    badge: ProductBadge | null;
    family?: { id: number; name: string } | null;
    fragrance_family_id: number | null;
    tagline: string | null;
    description: string | null;
    inspiration: string | null;
    concentration: string | null;
    gender: Gender | null;
    longevity: number | null;
    sillage: number | null;
    accent_color: string | null;
    sort_order: number;
    meta_title: string | null;
    meta_description: string | null;
    name_ar: string | null;
    tagline_ar: string | null;
    description_ar: string | null;
    inspiration_ar: string | null;
    concentration_ar: string | null;
    meta_title_ar: string | null;
    meta_description_ar: string | null;
    published_at: string | null;
    sales_count: number;
    deleted_at: string | null;
    image?: ImageAsset | null;
    images?: ImageAsset[];
    variants?: AdminVariant[];
    stock_total?: number;
    price_range?: { min: number | null; max: number | null };
    notes?: NotesByLayer;
    collection_ids?: number[];
    updated_at: string | null;
}

export interface ProductPayload {
    name: string;
    slug: string;
    status: ProductStatus;
    published_at: string | null;
    is_featured: boolean;
    badge: ProductBadge | null;
    fragrance_family_id: number | null;
    collection_ids: number[];
    gender: Gender | null;
    concentration: string | null;
    longevity: number | null;
    sillage: number | null;
    accent_color: string | null;
    tagline: string | null;
    description: string | null;
    inspiration: string | null;
    meta_title: string | null;
    meta_description: string | null;
    name_ar: string | null;
    tagline_ar: string | null;
    description_ar: string | null;
    inspiration_ar: string | null;
    concentration_ar: string | null;
    meta_title_ar: string | null;
    meta_description_ar: string | null;
    sort_order: number;
    notes: NotesByLayer;
    variants: Array<{
        id?: number;
        size_ml: number;
        sku: string;
        price: number;
        compare_at_price: number | null;
        stock: number;
        low_stock_threshold: number | null;
        is_active: boolean;
    }>;
}

export interface CatalogOptionProduct {
    id: number;
    name: string;
    status: ProductStatus;
    variants: Array<{ id: number; label: string; sku: string; price: number; stock: number; is_active: boolean }>;
}

export interface CatalogOptions {
    families: Array<{ id: number; name: string }>;
    collections: Array<{ id: number; name: string }>;
    notes: string[];
    sizes: number[];
    products: CatalogOptionProduct[];
    badges: ProductBadge[];
    genders: Gender[];
}

export interface Family {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    description: string | null;
    description_ar: string | null;
    sort_order: number;
    products_count?: number;
}

export interface FamilyPayload {
    name: string;
    name_ar: string | null;
    slug: string;
    description: string | null;
    description_ar: string | null;
    sort_order: number;
}

/** A fragrance note and its Arabic name, as listed for translation. */
export interface NoteTranslation {
    id: number;
    name: string;
    name_ar: string | null;
    products_count: number;
}

export interface AdminCollection {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    tagline: string | null;
    tagline_ar: string | null;
    description: string | null;
    description_ar: string | null;
    image_path: string | null;
    image_url: string | null;
    accent_color: string | null;
    is_visible: boolean;
    is_featured: boolean;
    is_demo: boolean;
    sort_order: number;
    products_count: number | null;
    products?: Array<{ id: number; name: string; status: ProductStatus }>;
}

export interface CollectionPayload {
    name: string;
    name_ar: string | null;
    slug: string;
    tagline: string | null;
    tagline_ar: string | null;
    description: string | null;
    description_ar: string | null;
    image_path: string | null;
    accent_color: string | null;
    is_visible: boolean;
    is_featured: boolean;
    sort_order: number;
    product_ids: number[];
}

export type PackType = 'custom' | 'fixed';
export type PackPricingType = 'fixed' | 'percent' | 'amount';
export type PackEligibility = 'all' | 'collections' | 'products';

export interface AdminPack {
    id: number;
    name: string;
    name_ar: string | null;
    slug: string;
    type: PackType;
    tagline: string | null;
    tagline_ar: string | null;
    description: string | null;
    description_ar: string | null;
    image_path: string | null;
    image_url: string | null;
    selection_count: number | null;
    allowed_sizes: number[] | null;
    eligibility: PackEligibility;
    allow_duplicates: boolean;
    pricing_type: PackPricingType;
    price: number | null;
    discount_value: number | null;
    pricing_label: string;
    is_active: boolean;
    is_demo: boolean;
    sort_order: number;
    bottle_count: number;
    starting_price: number | null;
    eligible_count?: number | null;
    collection_ids?: number[];
    product_ids?: number[];
    items?: Array<{ variant_id: number; quantity: number; label: string }>;
}

export interface PackPayload {
    name: string;
    name_ar: string | null;
    slug: string;
    type: PackType;
    tagline: string | null;
    tagline_ar: string | null;
    description: string | null;
    description_ar: string | null;
    image_path: string | null;
    is_active: boolean;
    sort_order: number;
    pricing_type: PackPricingType;
    price: number | null;
    discount_value: number | null;
    selection_count: number | null;
    allowed_sizes: number[];
    eligibility: PackEligibility | null;
    allow_duplicates: boolean;
    collection_ids: number[];
    product_ids: number[];
    items: Array<{ variant_id: number; quantity: number }>;
}

/* Inventory ------------------------------------------------------------- */

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock';
export type StockFilter = 'low' | 'out';
export type AdjustMode = 'set' | 'add' | 'remove';
export type InventoryReason = 'initial' | 'sale' | 'cancellation' | 'adjustment' | 'restock';

export interface InventoryRow {
    id: number;
    product_id: number;
    product: string | null;
    product_status: ProductStatus | null;
    label: string;
    sku: string;
    price: number;
    stock: number;
    low_stock_threshold: number;
    is_active: boolean;
    availability: Availability;
}

export interface InventoryList extends Paged<InventoryRow> {
    counts: { low: number; out: number };
}

export interface InventoryMovement {
    id: number;
    change: number;
    stock_after: number;
    reason: InventoryReason;
    note: string | null;
    user: string | null;
    order: string | null;
    created_at: string;
}

/* Customers ------------------------------------------------------------- */

export interface AdminCustomer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    orders_count: number;
    total_spent: number;
    /** Raw database datetime ("2026-10-21 14:05:00", store timezone), not ISO. */
    last_order_at: string | null;
    created_at: string | null;
}

export interface AdminCustomerDetail extends AdminCustomer {
    orders: AdminOrder[];
}

/* Promotions & content -------------------------------------------------- */

export type CouponType = 'percent' | 'fixed';

export interface AdminCoupon {
    id: number;
    code: string;
    description: string | null;
    type: CouponType;
    value: number;
    min_subtotal: number | null;
    max_uses: number | null;
    used_count: number;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    is_currently_valid: boolean;
}

export interface CouponPayload {
    code: string;
    description: string | null;
    type: CouponType;
    value: number;
    min_subtotal: number | null;
    max_uses: number | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
}

export interface AdminPage {
    id: number;
    slug: string;
    title: string;
    title_ar: string | null;
    body: string;
    body_ar: string | null;
    meta_description: string | null;
    meta_description_ar: string | null;
    is_published: boolean;
    sort_order: number;
    created_at: string | null;
    updated_at: string | null;
}

export interface PagePayload {
    title: string;
    title_ar: string | null;
    slug: string;
    body: string;
    body_ar: string | null;
    meta_description: string | null;
    meta_description_ar: string | null;
    is_published: boolean;
    sort_order: number;
}

export type SubscriberStatus = 'subscribed' | 'unsubscribed';

export interface Subscriber {
    id: number;
    email: string;
    status: SubscriberStatus;
    source: string | null;
    consented_at: string | null;
    unsubscribed_at: string | null;
}

export interface SubscriberList extends Paged<Subscriber> {
    counts: Record<SubscriberStatus, number>;
}

/* Delivery -------------------------------------------------------------- */

export interface DeliveryZone {
    id: number;
    name: string;
    fee: number;
    free_shipping_threshold: number | null;
    delivery_estimate: string | null;
    delivery_estimate_ar: string | null;
    is_active: boolean;
    sort_order: number;
    cities_count?: number;
}

export interface ZonePayload {
    name: string;
    fee: number;
    free_shipping_threshold: number | null;
    delivery_estimate: string | null;
    delivery_estimate_ar: string | null;
    is_active: boolean;
    sort_order: number;
}

export interface AdminCity {
    id: number;
    name: string;
    name_ar: string | null;
    region: string | null;
    region_ar: string | null;
    delivery_zone_id: number | null;
    is_active: boolean;
    sort_order: number;
    zone: { id: number; name: string } | null;
}

export interface CityPayload {
    name: string;
    name_ar: string | null;
    region: string | null;
    region_ar: string | null;
    delivery_zone_id: number | null;
    is_active: boolean;
}

/* Settings & team ------------------------------------------------------- */

export type SettingType = 'string' | 'text' | 'boolean' | 'integer' | 'url';
export type SettingValue = string | number | boolean | null;

export interface SettingField {
    key: string;
    group: string;
    type: SettingType;
    label: string;
    value: SettingValue;
}

export interface SettingsPayload {
    data: SettingField[];
    products: Array<{ id: number; name: string }>;
}

export interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: StaffRole;
    role_label: string;
    is_active: boolean;
    last_login_at: string | null;
}

export interface TeamList {
    data: TeamMember[];
    roles: Array<Option<StaffRole>>;
}

export interface NewMemberPayload {
    name: string;
    email: string;
    role: StaffRole;
    password: string;
}

export interface MemberUpdate {
    name?: string;
    role?: StaffRole;
    is_active?: boolean;
}
