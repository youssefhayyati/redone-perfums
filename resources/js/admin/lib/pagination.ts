/**
 * Page buttons for a pagination bar: the first and last pages, the current page with
 * its neighbours, and gaps in between. `pageWindow(6, 12)` → [1, 'gap', 5, 6, 7, 'gap', 12].
 */
export type PageSlot = number | 'gap';

export function pageWindow(current: number, last: number, neighbours = 1): PageSlot[] {
    if (last <= 1) {
        return [1];
    }

    const pages = new Set<number>([1, last]);
    for (let page = current - neighbours; page <= current + neighbours; page++) {
        if (page >= 1 && page <= last) {
            pages.add(page);
        }
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const slots: PageSlot[] = [];

    sorted.forEach((page, index) => {
        const previous = sorted[index - 1];
        if (previous !== undefined && page - previous > 1) {
            // A gap of exactly one page shows that page instead of an ellipsis.
            if (page - previous === 2) {
                slots.push(previous + 1);
            } else {
                slots.push('gap');
            }
        }
        slots.push(page);
    });

    return slots;
}

/** "21–40" for the current page, with the totals of the list meta. */
export function rangeOf(meta: { current_page: number; per_page: number; total: number; from?: number | null; to?: number | null }): { from: number; to: number } {
    const from = meta.from ?? (meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1);
    const to = meta.to ?? Math.min(meta.total, meta.current_page * meta.per_page);

    return { from, to };
}
