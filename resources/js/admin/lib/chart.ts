/** Geometry helpers for the inline SVG charts (no chart library). */

export interface Point {
    x: number;
    y: number;
}

/**
 * Round axis ticks from 0 to a clean maximum covering `max`. `unit` makes the steps
 * round in display units (100 for centimes shown in dirhams); `integer` forbids
 * fractional steps (counts).
 */
export function niceTicks(max: number, { count = 4, unit = 1, integer = false }: { count?: number; unit?: number; integer?: boolean } = {}): number[] {
    const target = Math.max(0, max) / unit;

    if (target === 0 || !Number.isFinite(target)) {
        return [0, unit];
    }

    const rough = target / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const residual = rough / magnitude;
    const factors = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
    let step = (factors.find((factor) => residual <= factor) ?? 10) * magnitude;

    if (integer) {
        step = Math.max(1, Math.round(step));
    }

    const top = Math.ceil(target / step - 1e-9) * step;
    const ticks: number[] = [];
    for (let value = 0; value <= top + step / 2; value += step) {
        ticks.push(Math.round(value * unit * 1e6) / 1e6);
    }

    return ticks;
}

export function linePath(points: Point[]): string {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

export function areaPath(points: Point[], baseline: number): string {
    if (points.length === 0) {
        return '';
    }

    const first = points[0]!;
    const last = points[points.length - 1]!;

    return `${linePath(points)} L${last.x.toFixed(2)} ${baseline.toFixed(2)} L${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

/** Up to `max` evenly spaced indices, always including the first and the last. */
export function labelIndices(length: number, max: number): number[] {
    if (length <= 0) {
        return [];
    }
    if (length <= max) {
        return Array.from({ length }, (_, index) => index);
    }

    const step = (length - 1) / (Math.max(2, max) - 1);
    const indices = Array.from({ length: Math.max(2, max) }, (_, index) => Math.round(index * step));

    return [...new Set(indices)];
}

/** Indices of the first day of each month ("YYYY-MM-01"), thinned to at most `max`. */
export function monthStartIndices(days: string[], max: number): number[] {
    const starts = days.flatMap((day, index) => (day.endsWith('-01') ? [index] : []));

    if (starts.length <= max) {
        return starts;
    }

    const every = Math.ceil(starts.length / max);

    return starts.filter((_, position) => position % every === 0);
}

/** Index of the data point nearest to a horizontal position inside the plot. */
export function nearestIndex(x: number, left: number, width: number, length: number): number {
    if (length <= 1 || width <= 0) {
        return 0;
    }

    const ratio = (x - left) / width;

    return Math.min(length - 1, Math.max(0, Math.round(ratio * (length - 1))));
}
