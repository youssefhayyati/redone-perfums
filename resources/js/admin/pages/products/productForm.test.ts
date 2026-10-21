import { describe, expect, it } from 'vitest';
import type { AdminProduct } from '../../types';
import { emptyProductForm, newVariantRow, productFormToPayload, productToForm, suggestSku } from './productForm';

const product: AdminProduct = {
    id: 1,
    name: 'Nuit d’Ambre',
    slug: 'nuit-dambre',
    status: 'active',
    is_featured: true,
    is_demo: false,
    badge: 'bestseller',
    fragrance_family_id: 3,
    tagline: 'Ambre et vanille',
    description: null,
    inspiration: null,
    concentration: 'Eau de parfum',
    gender: 'mixte',
    longevity: 4,
    sillage: null,
    accent_color: '#C9A46C',
    sort_order: 2,
    meta_title: null,
    meta_description: null,
    published_at: '2026-10-01T09:00:00+01:00',
    sales_count: 12,
    deleted_at: null,
    updated_at: null,
    notes: { top: ['Bergamote'], heart: ['Rose'], base: ['Ambre', 'Vanille'] },
    collection_ids: [2],
    variants: [
        { id: 10, size_ml: 50, sku: 'RP-NUIT-50', price: 69000, compare_at_price: 79050, stock: 12, low_stock_threshold: 5, is_active: true },
        { id: 11, size_ml: 100, sku: 'RP-NUIT-100', price: 99000, compare_at_price: null, stock: 0, low_stock_threshold: 3, is_active: false },
    ],
};

describe('productToForm', () => {
    it('shows prices in dirhams and dates in store time', () => {
        const form = productToForm(product);
        expect(form.variants.map((row) => [row.price, row.compare_at_price])).toEqual([
            ['690', '790,50'],
            ['990', ''],
        ]);
        expect(form.published_at).toBe('2026-10-01T09:00');
        expect(form.fragrance_family_id).toBe('3');
        expect(form.badge).toBe('bestseller');
    });
});

describe('productFormToPayload', () => {
    it('round-trips an existing product without changes', () => {
        const { payload, errors } = productFormToPayload(productToForm(product));
        expect(errors).toEqual({});
        expect(payload.variants).toEqual([
            { id: 10, size_ml: 50, sku: 'RP-NUIT-50', price: 69000, compare_at_price: 79050, stock: 12, low_stock_threshold: 5, is_active: true },
            { id: 11, size_ml: 100, sku: 'RP-NUIT-100', price: 99000, compare_at_price: null, stock: 0, low_stock_threshold: 3, is_active: false },
        ]);
        expect(payload.accent_color).toBe('#c9a46c');
        expect(payload.published_at).toBe('2026-10-01T09:00:00');
        expect(payload.fragrance_family_id).toBe(3);
        expect(payload.notes.base).toEqual(['Ambre', 'Vanille']);
    });

    it('converts typed dirhams to centimes and nullifies empty optionals', () => {
        const form = emptyProductForm();
        form.name = '  Fleur de Médina ';
        form.variants = [newVariantRow({ size_ml: '30', sku: 'rp-fleur-30', price: '450,50', compare_at_price: '', stock: '7', low_stock_threshold: '' })];
        const { payload, errors } = productFormToPayload(form);
        expect(errors).toEqual({});
        expect(payload.name).toBe('Fleur de Médina');
        expect(payload.tagline).toBeNull();
        expect(payload.badge).toBeNull();
        expect(payload.fragrance_family_id).toBeNull();
        expect(payload.variants[0]).toEqual({ size_ml: 30, sku: 'RP-FLEUR-30', price: 45050, compare_at_price: null, stock: 7, low_stock_threshold: null, is_active: true });
    });

    it('reports errors with Laravel keys', () => {
        const form = emptyProductForm();
        form.variants = [
            newVariantRow({ size_ml: '50', sku: 'A B', price: '12,345', compare_at_price: '10', stock: '-1' }),
            newVariantRow({ size_ml: '50', sku: 'OK-50', price: '', stock: '2' }),
        ];
        const { errors } = productFormToPayload(form);
        expect(errors.name).toBeDefined();
        expect(errors['variants.0.sku']).toBeDefined();
        expect(errors['variants.0.price']).toMatch(/Montant invalide/);
        expect(errors['variants.0.stock']).toBeDefined();
        expect(errors['variants.1.price']).toBe('Indiquez un prix.');
        expect(errors.variants).toMatch(/contenance/);
    });

    it('rejects a compare-at price that is not above the price', () => {
        const form = productToForm(product);
        form.variants[0]!.compare_at_price = '690';
        expect(productFormToPayload(form).errors['variants.0.compare_at_price']).toBeDefined();
    });

    it('deduplicates notes case-insensitively', () => {
        const form = productToForm(product);
        form.notes.top = ['Bergamote', ' bergamote ', '', 'Poivre rose'];
        expect(productFormToPayload(form).payload.notes.top).toEqual(['Bergamote', 'Poivre rose']);
    });
});

describe('suggestSku', () => {
    it('derives a reference from the name and size', () => {
        expect(suggestSku('Nuit d’Ambre', '50')).toBe('RP-NUITDAMB-50');
        expect(suggestSku('', '50')).toBe('');
        expect(suggestSku('Oud', '')).toBe('');
    });
});
