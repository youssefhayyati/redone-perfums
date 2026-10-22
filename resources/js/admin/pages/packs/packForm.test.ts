import { describe, expect, it } from 'vitest';
import type { AdminPack, CatalogOptionProduct } from '../../types';
import { emptyPackForm, newItemRow, packFormToPayload, packToForm } from './packForm';

const products: CatalogOptionProduct[] = [
    { id: 1, name: 'Nuit d’Ambre', status: 'active', variants: [{ id: 2, label: '50 ml', sku: 'A-50', price: 69000, stock: 4, is_active: true }] },
    { id: 7, name: 'Oud Minuit', status: 'active', variants: [{ id: 4, label: '50 ml', sku: 'B-50', price: 129000, stock: 2, is_active: true }] },
];

const base: AdminPack = {
    id: 3,
    name: 'Coffret Nuit',
    slug: 'coffret-nuit',
    type: 'fixed',
    tagline: null,
    description: null,
    name_ar: 'علبة الليل',
    tagline_ar: null,
    description_ar: null,
    name_en: 'Night Set',
    tagline_en: null,
    description_en: null,
    image_path: null,
    image_url: null,
    selection_count: null,
    allowed_sizes: null,
    eligibility: 'all',
    allow_duplicates: false,
    pricing_type: 'amount',
    price: null,
    discount_value: 30000,
    pricing_label: '-300 DH sur la sélection',
    is_active: true,
    is_demo: true,
    sort_order: 0,
    bottle_count: 2,
    starting_price: 168000,
    items: [
        { variant_id: 2, quantity: 1, label: 'Nuit d’Ambre — 50 ml' },
        { variant_id: 4, quantity: 1, label: 'Oud Minuit — 50 ml' },
    ],
};

describe('packToForm', () => {
    it('preselects the product of each fixed item and shows amounts in DH', () => {
        const form = packToForm(base, products);
        expect(form.items.map((row) => [row.product_id, row.variant_id, row.quantity])).toEqual([
            ['1', '2', '1'],
            ['7', '4', '1'],
        ]);
        expect(form.discount_amount).toBe('300');
    });
});

describe('packFormToPayload', () => {
    it('sends fixed items and an amount discount in centimes', () => {
        const { payload, errors } = packFormToPayload(packToForm(base, products));
        expect(errors).toEqual({});
        expect(payload).toMatchObject({
            type: 'fixed',
            name_ar: 'علبة الليل',
            tagline_ar: null,
            pricing_type: 'amount',
            price: null,
            discount_value: 30000,
            selection_count: null,
            eligibility: null,
            allow_duplicates: false,
            items: [
                { variant_id: 2, quantity: 1 },
                { variant_id: 4, quantity: 1 },
            ],
        });
    });

    it('sends custom rules only for the chosen eligibility', () => {
        const form = emptyPackForm();
        form.name = 'Découverte';
        form.pricing_type = 'percent';
        form.discount_percent = '15';
        form.selection_count = '3';
        form.eligibility = 'collections';
        form.collection_ids = [2];
        form.product_ids = [1, 7];
        form.allowed_sizes = [50, 30];
        const { payload, errors } = packFormToPayload(form);
        expect(errors).toEqual({});
        expect(payload).toMatchObject({ type: 'custom', discount_value: 15, price: null, selection_count: 3, eligibility: 'collections', collection_ids: [2], product_ids: [], allowed_sizes: [30, 50], items: [] });
    });

    it('converts a fixed price typed in dirhams', () => {
        const form = emptyPackForm();
        form.name = 'Trio';
        form.pricing_type = 'fixed';
        form.price = '1 790';
        expect(packFormToPayload(form).payload.price).toBe(179000);
    });

    it('validates the composition and pricing', () => {
        const form = emptyPackForm();
        form.pricing_type = 'percent';
        form.discount_percent = '95';
        form.selection_count = '1';
        form.eligibility = 'products';
        form.product_ids = [1];
        const { errors } = packFormToPayload(form);
        expect(errors.name).toBeDefined();
        expect(errors.discount_value).toBe('Pourcentage entier de 1 à 90.');
        expect(errors.selection_count).toBeDefined();

        const fixed = emptyPackForm();
        fixed.name = 'Duo';
        fixed.type = 'fixed';
        fixed.discount_percent = '10';
        fixed.items = [newItemRow({ variant_id: '2', quantity: '1' }), newItemRow({ variant_id: '', quantity: '9' })];
        const fixedErrors = packFormToPayload(fixed).errors;
        expect(fixedErrors['items.1.variant_id']).toBeDefined();
        expect(fixedErrors['items.1.quantity']).toBeDefined();
    });

    it('requires at least two bottles in a fixed pack', () => {
        const form = emptyPackForm();
        form.name = 'Solo';
        form.type = 'fixed';
        form.discount_percent = '10';
        form.items = [newItemRow({ variant_id: '2', quantity: '1' })];
        expect(packFormToPayload(form).errors.items).toBe('Un coffret fixe contient au moins deux flacons.');
    });
});
