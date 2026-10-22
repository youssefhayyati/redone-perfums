import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
    it('transliterates accents and drops apostrophes like Str::slug', () => {
        expect(slugify('Nuit d’Ambre')).toBe('nuit-dambre');
        expect(slugify('Cèdre de l’Atlas')).toBe('cedre-de-latlas');
        expect(slugify('  Néroli   d’Essaouira — 2026 ')).toBe('neroli-dessaouira-2026');
        expect(slugify('Œillet & Bœuf')).toBe('oeillet-boeuf');
    });

    it('produces valid slugs', () => {
        expect(isValidSlug(slugify('Fleur de Médina'))).toBe(true);
        expect(isValidSlug('Fleur de Médina')).toBe(false);
        expect(slugify('***')).toBe('');
    });
});
