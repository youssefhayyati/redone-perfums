import { describe, expect, it } from 'vitest';
import { parseLightMarkup, wordCount } from './markup';

describe('parseLightMarkup', () => {
    it('splits headings, lists and paragraphs', () => {
        const body = '## Délais\nLivraison sous 48 h.\nHors jours fériés.\n\n- Casablanca\n- Rabat\n\nMerci.';
        expect(parseLightMarkup(body)).toEqual([
            { type: 'heading', text: 'Délais' },
            { type: 'paragraph', lines: ['Livraison sous 48 h.', 'Hors jours fériés.'] },
            { type: 'list', items: ['Casablanca', 'Rabat'] },
            { type: 'paragraph', lines: ['Merci.'] },
        ]);
    });

    it('keeps markup-looking text as plain text', () => {
        expect(parseLightMarkup('<b>gras</b>')).toEqual([{ type: 'paragraph', lines: ['<b>gras</b>'] }]);
        expect(parseLightMarkup('   \n\n')).toEqual([]);
    });

    it('counts words without markup', () => {
        expect(wordCount('## Titre\n- un élément\nVoilà l’essentiel.')).toBe(5);
    });
});
