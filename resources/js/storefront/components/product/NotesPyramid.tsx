import type { NoteLayer, NotesPyramid as Notes } from '@shared/types';
import { cn } from '@shared/format';

const LAYERS: Array<{ key: NoteLayer; label: string; hint: string }> = [
    { key: 'top', label: 'Tête', hint: 'Les premières minutes' },
    { key: 'heart', label: 'Cœur', hint: 'Les heures qui suivent' },
    { key: 'base', label: 'Fond', hint: 'Le sillage qui demeure' },
];

export function hasNotes(notes: Notes | null | undefined): notes is Notes {
    return Boolean(notes && (notes.top.length || notes.heart.length || notes.base.length));
}

export function NotesPyramid({ notes, compact = false, className }: { notes: Notes; compact?: boolean; className?: string }) {
    return (
        <dl className={cn('grid', compact ? 'gap-5 sm:grid-cols-3' : 'gap-0 divide-y divide-line border-y border-line', className)}>
            {LAYERS.filter((layer) => notes[layer.key].length > 0).map((layer, index) => (
                <div key={layer.key} className={cn(compact ? 'flex flex-col gap-2' : 'grid gap-2 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6')}>
                    <dt className="flex flex-col gap-1">
                        <span className="flex items-center gap-3 font-display text-xl">
                            {!compact && <span className="text-xs text-accent tabular-nums">0{index + 1}</span>}
                            Notes de {layer.label.toLowerCase()}
                        </span>
                        {!compact && <span className="text-xs text-faint">{layer.hint}</span>}
                    </dt>
                    <dd className="text-muted">{notes[layer.key].join(' · ')}</dd>
                </div>
            ))}
        </dl>
    );
}
