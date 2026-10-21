import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@shared/format';
import { isAbortError } from '@shared/http';
import type { ControlProps } from './form';

interface TagInputProps {
    control: ControlProps;
    values: string[];
    onChange: (values: string[]) => void;
    /** Suggestions for the typed text (e.g. GET /notes?search=). */
    suggest: (query: string, signal: AbortSignal) => Promise<string[]>;
    placeholder?: string;
    max?: number;
}

const same = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0;

/**
 * Chips plus a combobox (WAI-ARIA 1.2 pattern): Enter or comma adds the highlighted
 * suggestion or the typed text, Backspace on an empty field removes the last chip,
 * arrows move through suggestions, Escape closes them.
 */
export function TagInput({ control, values, onChange, suggest, placeholder, max = 12 }: TagInputProps) {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [highlight, setHighlight] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestRef = useRef(suggest);
    const listId = useId();
    const full = values.length >= max;

    useEffect(() => {
        suggestRef.current = suggest;
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            suggestRef.current(text.trim(), controller.signal).then(
                (result) => {
                    setSuggestions(result.filter((item) => !values.some((value) => same(value, item))).slice(0, 8));
                    setHighlight(-1);
                },
                (error: unknown) => {
                    if (!isAbortError(error)) {
                        setSuggestions([]);
                    }
                },
            );
        }, 180);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [text, open, values]);

    const add = (raw: string) => {
        const value = raw.trim().replace(/,+$/, '').trim();
        if (value === '' || full || values.some((existing) => same(existing, value))) {
            setText('');

            return;
        }
        onChange([...values, value.slice(0, 60)]);
        setText('');
        setHighlight(-1);
    };

    const remove = (index: number) => {
        onChange(values.filter((_, position) => position !== index));
        inputRef.current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        const showing = open && suggestions.length > 0;
        if (event.key === 'ArrowDown' && suggestions.length > 0) {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) => (index + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp' && showing) {
            event.preventDefault();
            setHighlight((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        } else if (event.key === 'Enter' || event.key === ',') {
            if (text.trim() === '' && !(showing && highlight >= 0)) {
                return;
            }
            event.preventDefault();
            add(showing && highlight >= 0 ? suggestions[highlight]! : text);
        } else if (event.key === 'Backspace' && text === '' && values.length > 0) {
            onChange(values.slice(0, -1));
        } else if (event.key === 'Escape' && showing) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
        }
    };

    const activeId = open && highlight >= 0 ? `${listId}-${highlight}` : undefined;

    return (
        <div className="relative">
            <div
                className={cn(
                    'field-control flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 pl-1.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_22%,transparent)]',
                    control['aria-invalid'] && 'border-danger',
                )}
                onClick={() => inputRef.current?.focus()}
            >
                {values.map((value, index) => (
                    <span key={`${value}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken py-0.5 pl-2 pr-0.5 text-xs text-ink">
                        {value}
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                remove(index);
                            }}
                            className="inline-flex size-5 items-center justify-center rounded text-muted hover:bg-ink/[0.08] hover:text-ink"
                            aria-label={`Retirer ${value}`}
                        >
                            <X className="size-3" aria-hidden />
                        </button>
                    </span>
                ))}
                <input
                    {...control}
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open && suggestions.length > 0}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeId}
                    autoComplete="off"
                    value={text}
                    disabled={full}
                    placeholder={full ? `${max} maximum` : values.length === 0 ? placeholder : 'Ajouter…'}
                    onChange={(event) => {
                        const next = event.target.value;
                        if (next.endsWith(',')) {
                            add(next);
                        } else {
                            setText(next);
                            setOpen(true);
                        }
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                    onKeyDown={onKeyDown}
                    className="min-w-28 flex-1 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed"
                />
            </div>
            <ul
                id={listId}
                role="listbox"
                aria-label="Suggestions"
                className={cn(
                    'absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line-strong bg-raised py-1 shadow-[0_16px_40px_-12px_rgb(var(--rp-shadow)/0.5)]',
                    !(open && suggestions.length > 0) && 'hidden',
                )}
            >
                {suggestions.map((suggestion, index) => (
                    <li
                        key={suggestion}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === highlight}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            add(suggestion);
                        }}
                        onMouseEnter={() => setHighlight(index)}
                        className={cn('cursor-pointer px-3 py-1.5 text-sm text-ink', index === highlight && 'bg-ink/[0.07]')}
                    >
                        {suggestion}
                    </li>
                ))}
            </ul>
        </div>
    );
}
