import type {
    Availability,
    CouponType,
    Gender,
    InventoryReason,
    OrderStatus,
    PackEligibility,
    PackPricingType,
    PackType,
    PaymentStatus,
    ProductBadge,
    ProductStatus,
    SubscriberStatus,
} from '../types';

/** Semantic tone of a badge; each maps to theme tokens in <Badge>. */
export type Tone = 'neutral' | 'accent' | 'ink' | 'success' | 'warning' | 'danger' | 'muted';

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    processing: 'En préparation',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
};

/** Tab labels for lists of orders. */
export const ORDER_STATUS_PLURALS: Record<OrderStatus, string> = {
    pending: 'En attente',
    confirmed: 'Confirmées',
    processing: 'En préparation',
    shipped: 'Expédiées',
    delivered: 'Livrées',
    cancelled: 'Annulées',
};

export const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
    pending: 'warning',
    confirmed: 'accent',
    processing: 'accent',
    shipped: 'ink',
    delivered: 'success',
    cancelled: 'danger',
};

/** Verb shown on the button that moves an order to this status. */
export const ORDER_TRANSITION_VERBS: Record<OrderStatus, string> = {
    pending: 'Remettre en attente',
    confirmed: 'Confirmer',
    processing: 'Passer en préparation',
    shipped: 'Marquer expédiée',
    delivered: 'Marquer livrée',
    cancelled: 'Annuler la commande',
};

export const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    unpaid: 'Non payée',
    paid: 'Payée',
    refunded: 'Remboursée',
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, Tone> = {
    unpaid: 'muted',
    paid: 'success',
    refunded: 'danger',
};

export const PAYMENT_TRANSITION_VERBS: Record<PaymentStatus, string> = {
    unpaid: 'Marquer non payée',
    paid: 'Marquer payée',
    refunded: 'Marquer remboursée',
};

export const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'active', 'archived'];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
    draft: 'Brouillon',
    active: 'Publié',
    archived: 'Retiré de la vente',
};

export const PRODUCT_STATUS_TONES: Record<ProductStatus, Tone> = {
    draft: 'muted',
    active: 'success',
    archived: 'neutral',
};

export const BADGE_LABELS: Record<ProductBadge, string> = {
    new: 'Nouveauté',
    bestseller: 'Best-seller',
    limited: 'Édition limitée',
};

export const GENDER_LABELS: Record<Gender, string> = {
    feminin: 'Féminin',
    masculin: 'Masculin',
    mixte: 'Mixte',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
    in_stock: 'En stock',
    low_stock: 'Stock faible',
    out_of_stock: 'Rupture',
};

export const AVAILABILITY_TONES: Record<Availability, Tone> = {
    in_stock: 'success',
    low_stock: 'warning',
    out_of_stock: 'danger',
};

export const INVENTORY_REASON_LABELS: Record<InventoryReason, string> = {
    initial: 'Stock initial',
    sale: 'Vente',
    cancellation: 'Annulation de commande',
    adjustment: 'Ajustement',
    restock: 'Réassort',
};

export const PACK_TYPE_LABELS: Record<PackType, string> = {
    custom: 'À composer',
    fixed: 'Composition fixe',
};

export const PACK_PRICING_LABELS: Record<PackPricingType, string> = {
    fixed: 'Prix fixe',
    percent: 'Remise en %',
    amount: 'Remise en DH',
};

export const PACK_ELIGIBILITY_LABELS: Record<PackEligibility, string> = {
    all: 'Tout le catalogue',
    collections: 'Certaines collections',
    products: 'Parfums choisis',
};

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
    percent: 'Pourcentage',
    fixed: 'Montant fixe',
};

export const SUBSCRIBER_STATUS_LABELS: Record<SubscriberStatus, string> = {
    subscribed: 'Inscrit',
    unsubscribed: 'Désinscrit',
};

export function isOrderStatus(value: string | null | undefined): value is OrderStatus {
    return value !== null && value !== undefined && (ORDER_STATUSES as string[]).includes(value);
}

export function isPaymentStatus(value: string | null | undefined): value is PaymentStatus {
    return value !== null && value !== undefined && (PAYMENT_STATUSES as string[]).includes(value);
}
