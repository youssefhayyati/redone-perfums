import { useEffect, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { Blocker } from 'react-router';
import { cn } from '@shared/format';
import type { ControlProps } from './form';
import { Button } from './Button';
import { Dialog } from './Dialog';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Optional accent colour: native picker + hex text; empty means "none". */
export function ColorField({ control, value, onChange }: { control: ControlProps; value: string; onChange: (value: string) => void }) {
    const [draft, setDraft] = useState(value);

    useEffect(() => setDraft(value), [value]);

    return (
        <div className="flex items-center gap-2">
            <label
                className={cn(
                    'relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line-strong has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent',
                    value === '' && 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-line)_6px_7px)]',
                )}
                style={value !== '' ? { backgroundColor: value } : undefined}
            >
                <span className="sr-only">Choisir une couleur</span>
                <input
                    type="color"
                    value={HEX.test(value) ? value : '#c9a46c'}
                    onChange={(event) => onChange(event.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    tabIndex={0}
                />
            </label>
            <input
                {...control}
                type="text"
                value={draft}
                placeholder="#C9A46C"
                maxLength={7}
                spellCheck={false}
                onChange={(event) => {
                    const next = event.target.value.startsWith('#') || event.target.value === '' ? event.target.value : `#${event.target.value}`;
                    setDraft(next);
                    if (next === '' || HEX.test(next)) {
                        onChange(next);
                    }
                }}
                onBlur={() => {
                    if (draft !== '' && !HEX.test(draft)) {
                        onChange(draft);
                    }
                }}
                className="field-control w-32 font-mono text-xs uppercase"
            />
            {value !== '' && (
                <button type="button" onClick={() => onChange('')} className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
                    Aucune
                </button>
            )}
        </div>
    );
}

/** Multiple choice among a short list (collections, sizes) as toggle chips. */
export function ChipToggleGroup<V extends string | number>({
    label,
    options,
    value,
    onChange,
    emptyText,
}: {
    label: string;
    options: Array<{ value: V; label: ReactNode }>;
    value: V[];
    onChange: (value: V[]) => void;
    emptyText?: string;
}) {
    if (options.length === 0) {
        return <p className="text-sm text-muted">{emptyText ?? 'Aucun choix disponible.'}</p>;
    }

    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
            {options.map((option) => {
                const selected = value.includes(option.value);

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            selected ? 'border-accent bg-accent/10 text-ink' : 'border-line-strong text-muted hover:border-ink/40 hover:text-ink',
                        )}
                    >
                        {selected && <Check className="size-3 text-accent" aria-hidden />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** Asks before leaving a screen with unsaved edits (in-app navigation). */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
    return (
        <Dialog
            open={blocker.state === 'blocked'}
            onClose={() => blocker.reset?.()}
            role="alertdialog"
            size="sm"
            title="Quitter sans enregistrer ?"
            description="Vos modifications seront perdues."
            footer={
                <>
                    <Button onClick={() => blocker.reset?.()} data-autofocus>
                        Rester sur la page
                    </Button>
                    <Button variant="danger" icon={X} onClick={() => blocker.proceed?.()}>
                        Quitter la page
                    </Button>
                </>
            }
        />
    );
}

