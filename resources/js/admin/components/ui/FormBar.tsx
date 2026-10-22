import type { ReactNode } from 'react';
import { Save } from 'lucide-react';
import { cn } from '@shared/format';
import { Button } from './Button';

/**
 * Save bar pinned to the bottom of long forms. It states whether there are unsaved
 * changes and keeps the primary action within reach while scrolling.
 */
export function FormBar({
    form,
    dirty,
    saving,
    submitLabel = 'Enregistrer',
    onReset,
    extra,
}: {
    form: string;
    dirty: boolean;
    saving: boolean;
    submitLabel?: string;
    onReset?: () => void;
    extra?: ReactNode;
}) {
    return (
        <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={cn('flex items-center gap-2 text-xs', dirty ? 'text-warning' : 'text-muted')} aria-live="polite">
                    <span className={cn('size-1.5 rounded-full', dirty ? 'bg-warning' : 'bg-line-strong')} aria-hidden />
                    {dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {extra}
                    {onReset && dirty && (
                        <Button variant="ghost" onClick={onReset} disabled={saving}>
                            Annuler les modifications
                        </Button>
                    )}
                    <Button type="submit" form={form} variant="primary" icon={Save} loading={saving}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
