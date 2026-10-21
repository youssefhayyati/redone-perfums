import type { ReactNode } from 'react';
import { cn } from '@shared/format';

type Block = { kind: 'h2' | 'h3' | 'p'; text: string } | { kind: 'ul'; items: string[] };

/**
 * Parses the light markup stored for content pages ("## heading", "### subheading",
 * "- item", blank line between paragraphs). Text is rendered as React text nodes,
 * never as HTML, so page content cannot inject markup.
 */
export function parseBlocks(source: string): Block[] {
    const blocks: Block[] = [];
    let paragraph: string[] = [];

    const flush = () => {
        if (paragraph.length > 0) {
            blocks.push({ kind: 'p', text: paragraph.join(' ') });
            paragraph = [];
        }
    };

    for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
        const line = raw.trim();

        if (line === '') {
            flush();
        } else if (line.startsWith('### ')) {
            flush();
            blocks.push({ kind: 'h3', text: line.slice(4) });
        } else if (line.startsWith('## ')) {
            flush();
            blocks.push({ kind: 'h2', text: line.slice(3) });
        } else if (/^[-•*]\s+/.test(line)) {
            flush();
            const item = line.replace(/^[-•*]\s+/, '');
            const last = blocks[blocks.length - 1];
            if (last?.kind === 'ul') {
                last.items.push(item);
            } else {
                blocks.push({ kind: 'ul', items: [item] });
            }
        } else {
            paragraph.push(line);
        }
    }
    flush();

    return blocks;
}

/** **bold** spans inside a line. */
function inline(text: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part));
}

export function RichText({ source, className }: { source: string; className?: string }) {
    return (
        <div className={cn('prose-house', className)}>
            {parseBlocks(source).map((block, index) => {
                switch (block.kind) {
                    case 'h2':
                        return <h2 key={index}>{inline(block.text)}</h2>;
                    case 'h3':
                        return <h3 key={index}>{inline(block.text)}</h3>;
                    case 'ul':
                        return (
                            <ul key={index}>
                                {block.items.map((item, itemIndex) => (
                                    <li key={itemIndex}>{inline(item)}</li>
                                ))}
                            </ul>
                        );
                    default:
                        return <p key={index}>{inline(block.text)}</p>;
                }
            })}
        </div>
    );
}
