/** Moves one entry to another index; returns the same array when the move is invalid. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as T);

    return next;
}

/** Adds the value when absent, removes it when present. */
export function toggleItem<T>(items: T[], value: T): T[] {
    return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}
