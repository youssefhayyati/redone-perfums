import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@shared/format';
import { areaPath, labelIndices, linePath, monthStartIndices, nearestIndex, niceTicks } from '../../lib/chart';
import { formatDayMonth, formatLongDay, formatMonthYear } from '../../lib/format';

export interface TrendPoint {
    date: string;
    value: number;
}

interface TrendChartProps {
    points: TrendPoint[];
    /** Series name, used in the accessible description ("Chiffre d’affaires"). */
    seriesLabel: string;
    formatValue: (value: number) => string;
    formatTick: (value: number) => string;
    /** Steps in display units (100 for centimes shown in DH). */
    unit?: number;
    integer?: boolean;
    /** Previous data held at reduced opacity while the next period loads. */
    dimmed?: boolean;
}

const HEIGHT = 248;
const MARGIN = { top: 14, right: 12, bottom: 30 };

/**
 * Single-series area chart drawn in SVG. Hover or arrow keys move a crosshair that
 * snaps to the nearest day; the values are also available to screen readers as a
 * table rendered next to the chart by the caller.
 */
export function TrendChart({ points, seriesLabel, formatValue, formatTick, unit = 1, integer = false, dimmed = false }: TrendChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(640);
    const [active, setActive] = useState<number | null>(null);
    const readoutId = useId();

    useEffect(() => {
        const element = containerRef.current;
        if (!element) {
            return;
        }
        setWidth(element.clientWidth || 640);
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            if (entry) {
                setWidth(Math.max(240, Math.round(entry.contentRect.width)));
            }
        });
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const signature = points.length > 0 ? `${points[0]!.date}:${points.length}` : '';
    useEffect(() => setActive(null), [signature]);

    const max = Math.max(0, ...points.map((point) => point.value));
    const ticks = useMemo(() => niceTicks(max, { count: 4, unit, integer }), [max, unit, integer]);
    const top = ticks[ticks.length - 1] ?? 1;
    const tickLabels = ticks.map(formatTick);
    const left = Math.round(14 + Math.max(...tickLabels.map((label) => label.length)) * 6.2);
    const plotWidth = Math.max(10, width - left - MARGIN.right);
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const baseline = MARGIN.top + plotHeight;

    const x = (index: number) => left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = (value: number) => MARGIN.top + plotHeight - (top === 0 ? 0 : (value / top) * plotHeight);

    const coordinates = points.map((point, index) => ({ x: x(index), y: y(point.value) }));
    const longRange = points.length > 120;
    const maxLabels = Math.max(2, Math.floor(plotWidth / (longRange ? 64 : 76)));
    const xLabels = longRange ? monthStartIndices(points.map((point) => point.date), maxLabels) : labelIndices(points.length, maxLabels);
    const allZero = max === 0;

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setActive(nearestIndex(event.clientX - bounds.left, left, plotWidth, points.length));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const last = points.length - 1;
        const current = active ?? last;
        const moves: Record<string, number> = {
            ArrowLeft: Math.max(0, current - 1),
            ArrowRight: Math.min(last, current + 1),
            Home: 0,
            End: last,
            PageUp: Math.max(0, current - 7),
            PageDown: Math.min(last, current + 7),
        };
        if (event.key in moves) {
            event.preventDefault();
            setActive(moves[event.key]!);
        } else if (event.key === 'Escape') {
            setActive(null);
        }
    };

    const activePoint = active !== null ? points[active] : undefined;
    const activeX = active !== null ? x(active) : 0;
    const tooltipLeft = Math.min(Math.max(activeX, left + 70), width - 70);

    return (
        <div className={cn('transition-opacity duration-300', dimmed && 'opacity-50')}>
            <div
                ref={containerRef}
                className="relative rounded-md focus-visible:outline-offset-4"
                tabIndex={0}
                role="group"
                aria-label={`Graphique : ${seriesLabel.toLowerCase()} par jour. Utilisez les flèches gauche et droite pour parcourir les jours.`}
                aria-describedby={readoutId}
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
                onKeyDown={onKeyDown}
                onBlur={() => setActive(null)}
            >
                <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block max-w-full touch-pan-y select-none" aria-hidden>
                    {ticks.map((tick, index) => (
                        <g key={tick}>
                            <line
                                x1={left}
                                x2={width - MARGIN.right}
                                y1={y(tick)}
                                y2={y(tick)}
                                stroke={index === 0 ? 'var(--color-line-strong)' : 'var(--color-line)'}
                                shapeRendering="crispEdges"
                            />
                            {(!allZero || tick === 0) && (
                                <text x={left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
                                    {tickLabels[index]}
                                </text>
                            )}
                        </g>
                    ))}

                    {coordinates.length > 1 && !allZero && <path d={areaPath(coordinates, baseline)} fill="var(--color-accent)" fillOpacity={0.1} />}
                    {coordinates.length > 1 && (
                        <path
                            d={linePath(coordinates)}
                            fill="none"
                            stroke={allZero ? 'var(--color-line-strong)' : 'var(--color-accent)'}
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    )}

                    {xLabels.map((index) => (
                        <text
                            key={index}
                            x={x(index)}
                            y={HEIGHT - 9}
                            textAnchor={longRange ? 'middle' : index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                            className="fill-muted text-[10px]"
                        >
                            {longRange ? formatMonthYear(points[index]!.date) : formatDayMonth(points[index]!.date)}
                        </text>
                    ))}

                    {activePoint && (
                        <g>
                            <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={baseline} stroke="var(--color-line-strong)" shapeRendering="crispEdges" />
                            <circle cx={activeX} cy={y(activePoint.value)} r={4.5} fill="var(--color-accent)" stroke="var(--color-raised)" strokeWidth={2} />
                        </g>
                    )}
                </svg>

                {allZero && (
                    <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-muted">Aucune vente sur la période.</p>
                )}

                {activePoint && (
                    <div
                        className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line-strong bg-raised px-3 py-2 shadow-[0_8px_24px_-8px_rgb(var(--rp-shadow)/0.45)]"
                        style={{ left: tooltipLeft }}
                    >
                        <p className="text-sm font-semibold tabular-nums text-ink">{formatValue(activePoint.value)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-2xs text-muted">
                            <span className="inline-block h-0.5 w-3 rounded-full bg-accent" aria-hidden />
                            {formatLongDay(activePoint.date)}
                        </p>
                    </div>
                )}
            </div>
            <p id={readoutId} className="sr-only" aria-live="polite">
                {activePoint ? `${formatLongDay(activePoint.date)} : ${formatValue(activePoint.value)}` : ''}
            </p>
        </div>
    );
}
