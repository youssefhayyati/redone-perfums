import { parseDirhams, toDirhamsInput } from '@shared/money';
import { uniqueKey } from '../../lib/dom';
import type { FieldErrors } from '../../lib/errors';
import type { AdminPack, CatalogOptionProduct, PackEligibility, PackPayload, PackPricingType, PackType } from '../../types';
import { parseInteger } from '../products/productForm';

/**
 * Pack form ↔ API payload. Fixed prices and amount discounts are typed in dirhams
 * and sent in centimes; percent discounts are whole numbers (1–90). Only the fields
 * that matter for the chosen type and pricing are sent.
 */
export interface PackItemRow {
    key: string;
    product_id: string;
    variant_id: string;
    quantity: string;
}

export interface PackForm {
    name: string;
    slug: string;
    type: PackType;
    tagline: string;
    description: string;
    image_path: string | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: string;
    pricing_type: PackPricingType;
    price: string;
    discount_percent: string;
    discount_amount: string;
    selection_count: string;
    allowed_sizes: number[];
    eligibility: PackEligibility;
    allow_duplicates: boolean;
    collection_ids: number[];
    product_ids: number[];
    items: PackItemRow[];
}

export function newItemRow(defaults: Partial<PackItemRow> = {}): PackItemRow {
    return { key: uniqueKey('item'), product_id: '', variant_id: '', quantity: '1', ...defaults };
}

export function emptyPackForm(): PackForm {
    return {
        name: '',
        slug: '',
        type: 'custom',
        tagline: '',
        description: '',
        image_path: null,
        image_url: null,
        is_active: true,
        sort_order: '0',
        pricing_type: 'percent',
        price: '',
        discount_percent: '',
        discount_amount: '',
        selection_count: '3',
        allowed_sizes: [],
        eligibility: 'all',
        allow_duplicates: false,
        collection_ids: [],
        product_ids: [],
        items: [newItemRow({ key: 'item-new-1' }), newItemRow({ key: 'item-new-2' })],
    };
}

/** Finds the product owning a variant, to preselect it in the item rows. */
export function productOfVariant(products: CatalogOptionProduct[], variantId: number): CatalogOptionProduct | undefined {
    return products.find((product) => product.variants.some((variant) => variant.id === variantId));
}

export function packToForm(pack: AdminPack, products: CatalogOptionProduct[]): PackForm {
    return {
        name: pack.name,
        slug: pack.slug,
        type: pack.type,
        tagline: pack.tagline ?? '',
        description: pack.description ?? '',
        image_path: pack.image_path,
        image_url: pack.image_url,
        is_active: pack.is_active,
        sort_order: String(pack.sort_order ?? 0),
        pricing_type: pack.pricing_type,
        price: pack.pricing_type === 'fixed' ? toDirhamsInput(pack.price) : '',
        discount_percent: pack.pricing_type === 'percent' && pack.discount_value !== null ? String(pack.discount_value) : '',
        discount_amount: pack.pricing_type === 'amount' ? toDirhamsInput(pack.discount_value) : '',
        selection_count: pack.selection_count === null ? '3' : String(pack.selection_count),
        allowed_sizes: pack.allowed_sizes ?? [],
        eligibility: pack.eligibility,
        allow_duplicates: pack.allow_duplicates,
        collection_ids: pack.collection_ids ?? [],
        product_ids: pack.product_ids ?? [],
        items:
            pack.type === 'fixed' && pack.items && pack.items.length > 0
                ? pack.items.map((item, index) => ({
                      key: `item-${index}-${item.variant_id}`,
                      product_id: String(productOfVariant(products, item.variant_id)?.id ?? ''),
                      variant_id: String(item.variant_id),
                      quantity: String(item.quantity),
                  }))
                : [newItemRow({ key: 'item-new-1' }), newItemRow({ key: 'item-new-2' })],
    };
}

export function packFormToPayload(form: PackForm): { payload: PackPayload; errors: FieldErrors } {
    const errors: FieldErrors = {};
    const custom = form.type === 'custom';
    const text = (value: string) => (value.trim() === '' ? null : value.trim());

    if (form.name.trim() === '') {
        errors.name = 'Indiquez le nom du coffret.';
    }

    let price: number | null = null;
    let discount: number | null = null;

    if (form.pricing_type === 'fixed') {
        price = parseDirhams(form.price);
        if (price === null) {
            errors.price = form.price.trim() === '' ? 'Indiquez le prix du coffret.' : 'Montant invalide (ex. 1 290 ou 1290,50).';
        }
    } else if (form.pricing_type === 'percent') {
        discount = parseInteger(form.discount_percent);
        if (discount === null || discount < 1 || discount > 90) {
            errors.discount_value = 'Pourcentage entier de 1 à 90.';
        }
    } else {
        discount = parseDirhams(form.discount_amount);
        if (discount === null || discount < 1) {
            errors.discount_value = form.discount_amount.trim() === '' ? 'Indiquez le montant de la remise.' : 'Montant invalide (ex. 300).';
        }
    }

    let selectionCount: number | null = null;
    if (custom) {
        selectionCount = parseInteger(form.selection_count);
        if (selectionCount === null || selectionCount < 2 || selectionCount > 12) {
            errors.selection_count = 'Entre 2 et 12 flacons.';
        }
        if (form.eligibility === 'collections' && form.collection_ids.length === 0) {
            errors.collection_ids = 'Choisissez au moins une collection.';
        }
        if (form.eligibility === 'products' && !form.allow_duplicates && selectionCount !== null && form.product_ids.length < selectionCount) {
            errors.product_ids = 'Sélectionnez au moins autant de parfums que de flacons à composer.';
        }
    }

    const items: PackPayload['items'] = [];
    if (!custom) {
        form.items.forEach((row, index) => {
            const variant = parseInteger(row.variant_id);
            const quantity = parseInteger(row.quantity);
            if (variant === null) {
                errors[`items.${index}.variant_id`] = 'Choisissez un format.';
            }
            if (quantity === null || quantity < 1 || quantity > 6) {
                errors[`items.${index}.quantity`] = 'De 1 à 6.';
            }
            items.push({ variant_id: variant ?? 0, quantity: quantity ?? 0 });
        });
        const bottles = items.reduce((sum, item) => sum + item.quantity, 0);
        if (bottles < 2) {
            errors.items = 'Un coffret fixe contient au moins deux flacons.';
        }
    }

    const payload: PackPayload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        type: form.type,
        tagline: text(form.tagline),
        description: text(form.description),
        image_path: form.image_path,
        is_active: form.is_active,
        sort_order: parseInteger(form.sort_order) ?? 0,
        pricing_type: form.pricing_type,
        price,
        discount_value: discount,
        selection_count: selectionCount,
        allowed_sizes: custom ? [...form.allowed_sizes].sort((a, b) => a - b) : [],
        eligibility: custom ? form.eligibility : null,
        allow_duplicates: custom && form.allow_duplicates,
        collection_ids: custom && form.eligibility === 'collections' ? form.collection_ids : [],
        product_ids: custom && form.eligibility === 'products' ? form.product_ids : [],
        items,
    };

    return { payload, errors };
}
