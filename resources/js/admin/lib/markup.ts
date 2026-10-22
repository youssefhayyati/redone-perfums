/**
 * Content pages are stored as plain text with a light markup, rendered escaped by
 * the storefront: "## Titre" starts a heading, "- élément" a list item, and blank
 * lines separate paragraphs. This parser powers the editor preview.
 */
export type MarkupBlock =
    | { type: 'heading'; text: string }
    | { type: 'list'; items: string[] }
    | { type: 'paragraph'; lines: string[] };

export function parseLightMarkup(body: string): MarkupBlock[] {
    const blocks: MarkupBlock[] = [];
    let paragraph: string[] = [];
    let list: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            blocks.push({ type: 'paragraph', lines: paragraph });
            paragraph = [];
        }
    };
    const flushList = () => {
        if (list.length > 0) {
            blocks.push({ type: 'list', items: list });
            list = [];
        }
    };

    for (const rawLine of body.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (line === '') {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = /^#{2,3}\s+(.*)$/.exec(line);
        if (heading) {
            flushParagraph();
            flushList();
            blocks.push({ type: 'heading', text: heading[1]!.trim() });
            continue;
        }

        const item = /^[-•*]\s+(.*)$/.exec(line);
        if (item) {
            flushParagraph();
            list.push(item[1]!.trim());
            continue;
        }

        flushList();
        paragraph.push(line);
    }

    flushParagraph();
    flushList();

    return blocks;
}

/** Rough reading length for the editor footer: "≈ 2 min de lecture". */
export function wordCount(body: string): number {
    const words = body.replace(/^#{2,3}\s+|^[-•*]\s+/gm, '').match(/[\p{L}\p{N}’'-]+/gu);

    return words ? words.length : 0;
}
