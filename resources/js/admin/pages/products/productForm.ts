import { parseDirhams, toDirhamsInput } from '@shared/money';
import { isoToLocalInput, localInputToApi } from '../../lib/datetime';
import type { FieldErrors } from '../../lib/errors';
import { uniqueKey } from '../../lib/dom';
import type { AdminProduct, AdminVariant, Gender, NotesByLayer, ProductBadge, ProductPayload, ProductStatus } from '../../types';

/**
 * Product form state ↔ API payload. Prices are typed in dirhams ("450" or
 * "450,50") and sent as integer centimes; client-side errors use the same keys as
 * Laravel (`variants.0.price`) so both kinds of errors land on the same input.
 */
export interface VariantRow {
    /** React key; stable for the life of the row. */
    key: string;
    id?: number;
    size_ml: string;
    sku: string;
    price: string;
    compare_at_price: string;
    stock: string;
    low_stock_threshold: string;
    is_active: boolean;
}

export interface ProductForm {
    name: string;
    slug: string;
    status: ProductStatus;
    published_at: string;
    is_featured: boolean;
    badge: ProductBadge | '';
    fragrance_family_id: string;
    collection_ids: number[];
    gender: Gender | '';
    concentration: string;
    longevity: number | null;
    sillage: number | null;
    accent_color: string;
    tagline: string;
    description: string;
    inspiration: string;
    meta_title: string;
    meta_description: string;
    /** Arabic storefront copy; left blank, the French text is shown. */
    name_ar: string;
    name_en: string;
    tagline_ar: string;
    tagline_en: string;
    description_ar: string;
    description_en: string;
    inspiration_ar: string;
    inspiration_en: string;
    concentration_ar: string;
    concentration_en: string;
    meta_title_ar: string;
    meta_title_en: string;
    meta_description_ar: string;
    meta_description_en: string;
    sort_order: string;
    notes: NotesByLayer;
    variants: VariantRow[];
}

export const SKU_PATTERN = /^[A-Za-z0-9\-_.]+$/;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function newVariantRow(defaults: Partial<VariantRow> = {}): VariantRow {
    return {
        key: uniqueKey('variant'),
        size_ml: '',
        sku: '',
        price: '',
        compare_at_price: '',
        stock: '0',
        low_stock_threshold: '5',
        is_active: true,
        ...defaults,
    };
}

export function variantToRow(variant: AdminVariant): VariantRow {
    return {
        key: `variant-${variant.id}`,
        id: variant.id,
        size_ml: String(variant.size_ml),
        sku: variant.sku,
        price: toDirhamsInput(variant.price),
        compare_at_price: toDirhamsInput(variant.compare_at_price),
        stock: String(variant.stock),
        low_stock_threshold: String(variant.low_stock_threshold),
        is_active: variant.is_active,
    };
}

export function emptyProductForm(): ProductForm {
    return {
        name: '',
        slug: '',
        status: 'draft',
        published_at: '',
        is_featured: false,
        badge: '',
        fragrance_family_id: '',
        collection_ids: [],
        gender: '',
        concentration: '',
        longevity: null,
        sillage: null,
        accent_color: '',
        tagline: '',
        description: '',
        inspiration: '',
        meta_title: '',
        meta_description: '',
        name_ar: '',
        name_en: '',
        tagline_ar: '',
        tagline_en: '',
        description_ar: '',
        description_en: '',
        inspiration_ar: '',
        inspiration_en: '',
        concentration_ar: '',
        concentration_en: '',
        meta_title_ar: '',
        meta_title_en: '',
        meta_description_ar: '',
        meta_description_en: '',
        sort_order: '0',
        notes: { top: [], heart: [], base: [] },
        variants: [newVariantRow({ key: 'variant-new-1' })],
    };
}

export function productToForm(product: AdminProduct): ProductForm {
    return {
        name: product.name,
        slug: product.slug,
        status: product.status,
        published_at: isoToLocalInput(product.published_at),
        is_featured: product.is_featured,
        badge: product.badge ?? '',
        fragrance_family_id: product.fragrance_family_id === null ? '' : String(product.fragrance_family_id),
        collection_ids: product.collection_ids ?? [],
        gender: product.gender ?? '',
        concentration: product.concentration ?? '',
        longevity: product.longevity,
        sillage: product.sillage,
        accent_color: product.accent_color ?? '',
        tagline: product.tagline ?? '',
        description: product.description ?? '',
        inspiration: product.inspiration ?? '',
        meta_title: product.meta_title ?? '',
        meta_description: product.meta_description ?? '',
        name_ar: product.name_ar ?? '',
        name_en: product.name_en ?? '',
        tagline_ar: product.tagline_ar ?? '',
        tagline_en: product.tagline_en ?? '',
        description_ar: product.description_ar ?? '',
        description_en: product.description_en ?? '',
        inspiration_ar: product.inspiration_ar ?? '',
        inspiration_en: product.inspiration_en ?? '',
        concentration_ar: product.concentration_ar ?? '',
        concentration_en: product.concentration_en ?? '',
        meta_title_ar: product.meta_title_ar ?? '',
        meta_title_en: product.meta_title_en ?? '',
        meta_description_ar: product.meta_description_ar ?? '',
        meta_description_en: product.meta_description_en ?? '',
        sort_order: String(product.sort_order ?? 0),
        notes: {
            top: product.notes?.top ?? [],
            heart: product.notes?.heart ?? [],
            base: product.notes?.base ?? [],
        },
        variants: (product.variants ?? []).map(variantToRow),
    };
}

function nullableText(value: string): string | null {
    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
}

/** Whole number from an input, or null when it is not one. */
export function parseInteger(value: string): number | null {
    const trimmed = value.trim().replace(/\s/g, '');

    return /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : null;
}

function uniqueNotes(notes: string[]): string[] {
    const seen = new Set<string>();

    return notes
        .map((note) => note.trim())
        .filter((note) => {
            const key = note.toLocaleLowerCase('fr');
            if (note === '' || seen.has(key)) {
                return false;
            }
            seen.add(key);

            return true;
        });
}

export function productFormToPayload(form: ProductForm): { payload: ProductPayload; errors: FieldErrors } {
    const errors: FieldErrors = {};

    if (form.name.trim() === '') {
        errors.name = 'Indiquez le nom du parfum.';
    }
    if (form.accent_color !== '' && !HEX_COLOR.test(form.accent_color)) {
        errors.accent_color = 'Couleur au format #RRGGBB.';
    }
    if (form.variants.length === 0) {
        errors.variants = 'Ajoutez au moins un format.';
    }

    const variants = form.variants.map((row, index) => {
        const at = (field: string) => `variants.${index}.${field}`;
        const size = parseInteger(row.size_ml);
        const price = parseDirhams(row.price);
        const compareAt = row.compare_at_price.trim() === '' ? null : parseDirhams(row.compare_at_price);
        const stock = parseInteger(row.stock);
        const threshold = row.low_stock_threshold.trim() === '' ? null : parseInteger(row.low_stock_threshold);
        const sku = row.sku.trim().toUpperCase();

        if (size === null || size < 1 || size > 1000) {
            errors[at('size_ml')] = 'Contenance en ml (1 à 1000).';
        }
        if (sku === '') {
            errors[at('sku')] = 'Référence obligatoire.';
        } else if (!SKU_PATTERN.test(sku)) {
            errors[at('sku')] = 'Lettres, chiffres, « - », « _ » ou « . » uniquement.';
        }
        if (row.price.trim() === '') {
            errors[at('price')] = 'Indiquez un prix.';
        } else if (price === null) {
            errors[at('price')] = 'Montant invalide (ex. 450 ou 450,50).';
        }
        if (row.compare_at_price.trim() !== '' && compareAt === null) {
            errors[at('compare_at_price')] = 'Montant invalide (ex. 590).';
        } else if (compareAt !== null && price !== null && compareAt <= price) {
            errors[at('compare_at_price')] = 'Doit être supérieur au prix.';
        }
        if (stock === null) {
            errors[at('stock')] = 'Quantité entière (0 ou plus).';
        }
        if (row.low_stock_threshold.trim() !== '' && (threshold === null || threshold > 1000)) {
            errors[at('low_stock_threshold')] = 'Nombre entier de 0 à 1000.';
        }

        return {
            ...(row.id !== undefined ? { id: row.id } : {}),
            size_ml: size ?? 0,
            sku,
            price: price ?? 0,
            compare_at_price: compareAt,
            stock: stock ?? 0,
            low_stock_threshold: threshold,
            is_active: row.is_active,
        };
    });

    const sizes = variants.map((variant) => variant.size_ml).filter((size) => size > 0);
    if (new Set(sizes).size !== sizes.length) {
        errors.variants = 'Chaque contenance ne peut apparaître qu’une fois.';
    }
    const skus = variants.map((variant) => variant.sku).filter(Boolean);
    if (new Set(skus).size !== skus.length) {
        errors.variants = 'Chaque référence (SKU) doit être unique.';
    }

    const payload: ProductPayload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        status: form.status,
        published_at: localInputToApi(form.published_at),
        is_featured: form.is_featured,
        badge: form.badge === '' ? null : form.badge,
        fragrance_family_id: form.fragrance_family_id === '' ? null : Number(form.fragrance_family_id),
        collection_ids: form.collection_ids,
        gender: form.gender === '' ? null : form.gender,
        concentration: nullableText(form.concentration),
        longevity: form.longevity,
        sillage: form.sillage,
        accent_color: form.accent_color === '' ? null : form.accent_color.toLowerCase(),
        tagline: nullableText(form.tagline),
        description: nullableText(form.description),
        inspiration: nullableText(form.inspiration),
        meta_title: nullableText(form.meta_title),
        meta_description: nullableText(form.meta_description),
        name_ar: nullableText(form.name_ar),
        name_en: nullableText(form.name_en),
        tagline_ar: nullableText(form.tagline_ar),
        tagline_en: nullableText(form.tagline_en),
        description_ar: nullableText(form.description_ar),
        description_en: nullableText(form.description_en),
        inspiration_ar: nullableText(form.inspiration_ar),
        inspiration_en: nullableText(form.inspiration_en),
        concentration_ar: nullableText(form.concentration_ar),
        concentration_en: nullableText(form.concentration_en),
        meta_title_ar: nullableText(form.meta_title_ar),
        meta_title_en: nullableText(form.meta_title_en),
        meta_description_ar: nullableText(form.meta_description_ar),
        meta_description_en: nullableText(form.meta_description_en),
        sort_order: parseInteger(form.sort_order) ?? 0,
        notes: { top: uniqueNotes(form.notes.top), heart: uniqueNotes(form.notes.heart), base: uniqueNotes(form.notes.base) },
        variants,
    };

    return { payload, errors };
}

/** Suggested SKU for a new format: "RP-NUITDAMB-50" from the product name and size. */
export function suggestSku(productName: string, size: string): string {
    const stem = productName
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
    const ml = parseInteger(size);

    return stem === '' || ml === null ? '' : `RP-${stem}-${ml}`;
}
