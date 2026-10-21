import { Minus, Plus } from 'lucide-react';
import { cn } from '@shared/format';

interface QuantityStepperProps {
    value: number;
    max: number;
    min?: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    label?: string;
    size?: 'sm' | 'md';
}

export function QuantityStepper({ value, max, min = 1, onChange, disabled = false, label = 'Quantité', size = 'md' }: QuantityStepperProps) {
    const box = size === 'sm' ? 'h-9' : 'h-12';
    const button = cn('flex items-center justify-center text-muted transition-colors hover:text-ink disabled:opacity-35', size === 'sm' ? 'w-8' : 'w-11');

    return (
        <div role="group" aria-label={label} className={cn('inline-flex items-stretch border border-line-strong', box)}>
            <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Diminuer la quantité">
                <Minus className="size-3.5" strokeWidth={1.5} />
            </button>
            <output aria-live="polite" className={cn('flex min-w-8 items-center justify-center text-sm tabular-nums', size === 'sm' ? 'min-w-7' : 'min-w-10')}>
                {value}
            </output>
            <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Augmenter la quantité">
                <Plus className="size-3.5" strokeWidth={1.5} />
            </button>
        </div>
    );
}
