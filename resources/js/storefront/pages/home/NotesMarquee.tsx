import { useMemo } from 'react';
import { useReducedMotionConfig } from 'framer-motion';
import type { NoteLayer, ProductCard } from '@shared/types';
import { cn } from '@shared/format';

const LAYERS: NoteLayer[] = ['top', 'heart', 'base'];

/** Each copy of the track repeats the notes until it holds at least this many. */
const MIN_NOTES_PER_COPY = 12;

/** Distinct notes of the given perfumes, top notes first. */
function collectNotes(products: ProductCard[]): string[] {
    const notes = new Set<string>();

    for (const layer of LAYERS) {
        for (const product of products) {
            product.notes?.[layer].forEach((note) => notes.add(note));
        }
    }

    return [...notes].slice(0, 16);
}

/** Decorative band of the house's notes, drifting slowly; it holds still when motion is reduced. */
export function NotesMarquee({ products }: { products: ProductCard[] }) {
    const reduced = useReducedMotionConfig();
    const notes = useMemo(() => collectNotes(products), [products]);

    if (notes.length < 4) {
        return null;
    }

    const copy = Array.from({ length: Math.ceil(MIN_NOTES_PER_COPY / notes.length) }, () => notes).flat();

    return (
        <div aria-hidden="true" className="group overflow-hidden border-y border-line py-5 sm:py-7">
            <div className={cn('flex w-max', !reduced && 'animate-marquee group-hover:[animation-play-state:paused]')} style={{ animationDuration: `${copy.length * 4}s` }}>
                {[0, 1].map((track) => (
                    <ul key={track} className="flex shrink-0 items-center">
                        {copy.map((note, index) => (
                            <li key={index} className="flex items-center gap-8 pr-8 font-display text-display-sm whitespace-nowrap text-muted italic sm:gap-12 sm:pr-12">
                                {note}
                                <span className="size-1.5 rotate-45 bg-accent" />
                            </li>
                        ))}
                    </ul>
                ))}
            </div>
        </div>
    );
}
