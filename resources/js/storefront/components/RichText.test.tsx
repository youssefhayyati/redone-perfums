import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseBlocks, RichText } from './RichText';

describe('parseBlocks', () => {
    it('recognises headings, lists and paragraphs', () => {
        const blocks = parseBlocks('Intro line one\nline two\n\n## Livraison\n- Casablanca\n- Rabat\n\n### Délais\nTexte');

        expect(blocks).toEqual([
            { kind: 'p', text: 'Intro line one line two' },
            { kind: 'h2', text: 'Livraison' },
            { kind: 'ul', items: ['Casablanca', 'Rabat'] },
            { kind: 'h3', text: 'Délais' },
            { kind: 'p', text: 'Texte' },
        ]);
    });

    it('handles Windows line endings', () => {
        expect(parseBlocks('a\r\n\r\nb')).toEqual([
            { kind: 'p', text: 'a' },
            { kind: 'p', text: 'b' },
        ]);
    });
});

describe('RichText', () => {
    it('renders page text as text, never as HTML', () => {
        const html = renderToStaticMarkup(<RichText source={'## <img src=x onerror=alert(1)>\n<script>alert(1)</script> **gras**'} />);

        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('<strong>gras</strong>');
    });
});
