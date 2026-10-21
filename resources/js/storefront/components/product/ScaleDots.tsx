import { cn } from '@shared/format';

const WORDS: Record<string, string[]> = {
    longevity: ['Discrète', 'Légère', 'Modérée', 'Tenace', 'Très tenace'],
    sillage: ['Intime', 'Doux', 'Présent', 'Affirmé', 'Remarquable'],
};

/** A 1–5 scale; nothing is rendered when the store has not communicated the value. */
export function ScaleDots({ label, value, kind }: { label: string; value: number | null; kind: 'longevity' | 'sillage' }) {
    if (value === null) {
        return null;
    }

    const word = WORDS[kind]?.[value - 1];

    return (
        <div className="flex flex-col gap-2">
            <dt className="eyebrow">{label}</dt>
            <dd className="flex items-center gap-3">
                <span className="flex items-center gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((step) => (
                        <span key={step} className={cn('w-6 transition-colors', step <= value ? 'h-0.5 bg-accent' : 'h-px bg-line-strong')} />
                    ))}
                </span>
                <span className="text-sm text-ink">
                    {word}
                    <span className="sr-only"> ({value} sur 5)</span>
                </span>
            </dd>
        </div>
    );
}
