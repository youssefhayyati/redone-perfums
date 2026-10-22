import { isValidElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '@shared/locale';
import { localizedPath, t, tn, tNodes } from './index';

afterEach(() => setLocale('fr'));

describe('t', () => {
    it('returns the French message on French pages', () => {
        expect(t('Bonjour, {name}', { name: 'Salma' })).toBe('Bonjour, Salma');
    });

    it('returns the Arabic translation on Arabic pages', () => {
        setLocale('ar');
        expect(t('Bonjour, {name}', { name: 'Salma' })).toBe('مرحبًا، Salma');
    });

    it('returns the English translation on English pages', () => {
        setLocale('en');
        expect(t('Bonjour, {name}', { name: 'Salma' })).toBe('Hello, Salma');
        expect(t('Ajouter au panier')).toBe('Add to cart');
    });

    it('leaves a placeholder without a value as written', () => {
        expect(t('Ajouter {name} {size} à la sélection', { name: 'Oud' })).toBe('Ajouter Oud {size} à la sélection');
    });
});

describe('tNodes', () => {
    it('places elements where the translation puts their placeholder', () => {
        setLocale('ar');
        const parts = tNodes('Bonjour, {name}', { name: <strong>Salma</strong> });
        expect(parts[0]).toBe('مرحبًا، ');
        expect(isValidElement(parts[1])).toBe(true);
    });
});

describe('tn', () => {
    it('uses the French singular for 0 and 1', () => {
        expect(tn(0, 'parfum')).toBe('0 parfum');
        expect(tn(1, 'parfum')).toBe('1 parfum');
        expect(tn(3, 'parfum')).toBe('3 parfums');
    });

    it.each([
        [0, '0 perfumes'],
        [1, '1 perfume'],
        [2, '2 perfumes'],
    ])('uses the English singular only for 1 (%i)', (count, expected) => {
        setLocale('en');
        expect(tn(count, 'parfum')).toBe(expected);
        expect(tn(count, 'coffret')).toBe(expected.replace('perfume', 'gift set'));
    });

    it.each([
        [1, 'عطر واحد'],
        [2, 'عطران'],
        [3, '3 عطور'],
        [10, '10 عطور'],
        [11, '11 عطرًا'],
        [99, '99 عطرًا'],
        [100, '100 عطر'],
        [0, '0 عطر'],
    ])('uses the Arabic form for %i', (count, expected) => {
        setLocale('ar');
        expect(tn(count, 'parfum')).toBe(expected);
    });
});

describe('localizedPath', () => {
    it('prefixes Arabic paths with /ar and English ones with /en', () => {
        expect(localizedPath('/boutique', 'ar')).toBe('/ar/boutique');
        expect(localizedPath('/', 'ar')).toBe('/ar');
        expect(localizedPath('/boutique', 'en')).toBe('/en/boutique');
        expect(localizedPath('/', 'en')).toBe('/en');
        expect(localizedPath('/boutique', 'fr')).toBe('/boutique');
    });
});
