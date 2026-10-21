import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@shared/format';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    className?: string;
    delay?: number;
}

/**
 * Search box that commits after a short pause (or on Enter). External changes (a
 * reset, the back button) replace the draft; typing is never overwritten by a stale
 * value coming back from the URL.
 */
export function SearchInput({ value, onChange, label, placeholder, className, delay = 350 }: SearchInputProps) {
    const [draft, setDraft] = useState(value);
    const committed = useRef(value);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    });

    useEffect(() => {
        if (value !== committed.current) {
            committed.current = value;
            setDraft(value);
        }
    }, [value]);

    useEffect(() => {
        if (draft.trim() === committed.current.trim()) {
            return;
        }

        const timer = window.setTimeout(() => {
            committed.current = draft.trim();
            onChangeRef.current(draft.trim());
        }, delay);

        return () => window.clearTimeout(timer);
    }, [draft, delay]);

    const commitNow = (next: string) => {
        committed.current = next.trim();
        onChangeRef.current(next.trim());
    };

    return (
        <div className={cn('relative min-w-0', className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commitNow(draft);
                    } else if (event.key === 'Escape' && draft !== '') {
                        event.preventDefault();
                        event.stopPropagation();
                        setDraft('');
                        commitNow('');
                    }
                }}
                aria-label={label}
                placeholder={placeholder}
                className="field-control pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {draft !== '' && (
                <button
                    type="button"
                    onClick={() => {
                        setDraft('');
                        commitNow('');
                    }}
                    className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink"
                    aria-label="Effacer la recherche"
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            )}
        </div>
    );
}
