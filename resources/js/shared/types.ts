/**
 * Shapes returned by the JSON API (see app/Http/Resources). Money fields are integer
 * centimes; dates are ISO 8601 strings.
 */

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock';

export type ProductBadge = 'new' | 'bestseller' | 'limited';

export type NoteLayer = 'top' | 'heart' | 'base';

export type NotesPyramid = Record<NoteLayer, string[]>;

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface ImageAsset {
    id: number;
    url: string | null;
    srcset: string | null;
    alt: string | null;
    width: number | null;
    height: number | null;
}

export interface Variant {
    id: number;
    size_ml: number;
    sku: string;
    label: string;
    price: number;
    compare_at_price: number | null;
    availability: Availability;
    stock_left: number | null;
}

export interface NamedLink {
    name: string;
    slug: string;
}

export interface ProductCard {
    id: number;
    slug: string;
    name: string;
    tagline: string | null;
    excerpt: string | null;
    family: NamedLink | null;
    concentration: string | null;
    badge: ProductBadge | null;
    accent_color: string | null;
    image: ImageAsset | null;
    hover_image: ImageAsset | null;
    price_from: number | null;
    has_price_range: boolean;
    variants: Variant[];
    in_stock: boolean;
    notes: NotesPyramid | null;
}

export interface Product extends ProductCard {
    description: string | null;
    inspiration: string | null;
    gender: 'feminin' | 'masculin' | 'mixte' | null;
    longevity: number | null;
    sillage: number | null;
    images: ImageAsset[];
    collections: NamedLink[];
    meta: { title: string; description: string | null };
}

export interface Collection {
    id: number;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    image: string | null;
    accent_color: string | null;
    products_count?: number;
    products?: ProductCard[];
}

export interface Family {
    name: string;
    slug: string;
    description: string | null;
    products_count: number;
    products: ProductCard[];
}

export interface PackContent {
    quantity: number;
    variant: Variant | null;
    product: { name: string; slug: string; image: ImageAsset | null } | null;
}

export interface Pack {
    id: number;
    slug: string;
    name: string;
    type: 'custom' | 'fixed';
    tagline: string | null;
    description: string | null;
    image: string | null;
    selection_count: number | null;
    bottle_count: number;
    allowed_sizes: number[] | null;
    allow_duplicates: boolean;
    pricing: {
        type: 'fixed' | 'percent' | 'amount';
        price: number | null;
        discount_value: number | null;
        label: string;
    };
    starting_price: number | null;
    contents?: PackContent[];
}

export interface PackOption extends ProductCard {
    pack_variants: Variant[];
}

export interface PackQuote {
    compare_at: number;
    price: number;
    savings: number;
    out_of_stock: number[];
}

export interface Facets {
    families: Array<NamedLink & { count: number }>;
    collections: NamedLink[];
    sizes: number[];
    price: { min: number; max: number };
    sorts: string[];
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface Paginated<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface LineIssue {
    code: 'unavailable' | 'insufficient_stock' | string;
    message: string;
}

interface CartLineBase {
    id: number;
    quantity: number;
    unit_price: number | null;
    compare_at_price: number | null;
    line_total: number;
    issues: LineIssue[];
}

export interface ProductCartLine extends CartLineBase {
    type: 'product';
    product: { name: string; slug: string; family: string | null; image: ImageAsset | null } | null;
    variant: { id: number; size_ml: number; sku: string; label: string } | null;
}

export interface PackSelection {
    variant_id: number;
    product_name: string;
    product_slug: string;
    size_ml: number;
    unit_price: number;
    image: ImageAsset | null;
}

export interface PackCartLine extends CartLineBase {
    type: 'pack';
    pack: { id: number; slug: string; name: string; type: 'custom' | 'fixed'; image: string | null; editable: boolean } | null;
    selections: PackSelection[];
    raw_selections: number[] | null;
}

export type CartLine = ProductCartLine | PackCartLine;

export interface Cart {
    token: string | null;
    lines: CartLine[];
    items_count: number;
    subtotal: number;
    coupon: { code: string; discount: number; error: string | null } | null;
    discount_total: number;
    delivery: {
        city_id: number;
        city: string;
        fee: number | null;
        free_shipping_threshold: number | null;
        remaining_for_free_shipping: number | null;
        estimate: string | null;
        error: string | null;
    } | null;
    total: number | null;
    merchandise_total: number;
    is_checkout_ready: boolean;
    max_quantity: number;
}

export interface City {
    id: number;
    name: string;
    region: string | null;
    fee: number;
    free_shipping_threshold: number | null;
    estimate: string | null;
}

export interface OrderItem {
    id: number;
    type: 'product' | 'pack';
    name: string;
    sku: string | null;
    pack_id: number | null;
    variant_label: string | null;
    unit_price: number;
    compare_at_price: number | null;
    quantity: number;
    line_total: number;
    selections: Array<{ product_name: string; size_ml: number; unit_price: number }>;
}

export interface Order {
    reference: string;
    status: OrderStatus;
    status_label: string;
    payment_method: string;
    payment_method_label: string;
    payment_status: PaymentStatus;
    customer_name: string;
    phone: string;
    email: string | null;
    city: string;
    address: string;
    delivery_notes: string | null;
    tracking_number: string | null;
    carrier: string | null;
    subtotal: number;
    discount_total: number;
    coupon_code: string | null;
    delivery_fee: number;
    total: number;
    items_count: number;
    placed_at: string;
    items?: OrderItem[];
}

export interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
}

export interface ContentPage {
    slug: string;
    title: string;
    body: string;
    meta_description: string | null;
    updated_at: string | null;
}

export interface Benefit {
    icon: 'truck' | 'banknote' | 'layers' | 'gift' | 'message-circle' | string;
    title: string;
    text: string;
}

/** The shop on a map; the storefront shows it once the admin has filled its coordinates. */
export interface StoreLocation {
    lat: number;
    lng: number;
    zoom: number;
    title: string | null;
    hours: string | null;
}

export interface StorefrontConfig {
    store: { name: string; wordmark: string; descriptor: string; meta_description: string };
    /** Audience measurement identifiers (Settings → Mesure d'audience), loaded after cookie consent. */
    analytics: { ga4?: string; meta_pixel?: string };
    announcement: { enabled: boolean; text: string | null; link: string | null };
    contact: { email: string | null; phone: string | null; whatsapp: string | null; address: string | null; hours: string | null };
    location: StoreLocation | null;
    social: { instagram?: string; tiktok?: string; facebook?: string };
    payment_methods: Array<{ code: string; label: string; description: string }>;
    checkout: { email_required: boolean };
    benefits: Benefit[];
    pages: Array<{ slug: string; title: string }>;
    collections: NamedLink[];
    has_packs: boolean;
}

/** One step of making a perfume, told in the homepage's "Le laboratoire" section. */
export interface LabStep {
    id: number;
    title: string;
    body: string;
    detail: string | null;
    image: string | null;
    /** Author and licence of a photo the store did not take. */
    credit: string | null;
}

export interface HomePayload {
    hero: { eyebrow: string | null; title: string | null; subtitle: string | null };
    lab: { title: string | null; intro: string | null; steps: LabStep[] } | null;
    featured: ProductCard[];
    story: { eyebrow: string | null; title: string; body: string | null; product: Product } | null;
    collections: Collection[];
    packs: Pack[];
}
