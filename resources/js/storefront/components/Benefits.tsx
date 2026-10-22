import { Banknote, Gift, Layers, MessageCircle, Sparkles, Truck, type LucideIcon } from 'lucide-react';
import type { Benefit } from '@shared/types';
import { cn } from '@shared/format';
import { RevealGroup, RevealItem } from '../motion/Reveal';

const ICONS: Record<string, LucideIcon> = {
    truck: Truck,
    banknote: Banknote,
    layers: Layers,
    gift: Gift,
    'message-circle': MessageCircle,
};

/** Reassurance items, all derived from the store's real configuration. */
export function Benefits({ benefits, className }: { benefits: Benefit[]; className?: string }) {
    if (benefits.length === 0) {
        return null;
    }

    return (
        <RevealGroup as="ul" className={cn('grid gap-x-10 gap-y-12 border-t border-line pt-10 sm:grid-cols-2', benefits.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3', className)}>
            {benefits.map((benefit, position) => {
                const Icon = ICONS[benefit.icon] ?? Sparkles;

                return (
                    <RevealItem as="li" key={benefit.title} className="flex flex-col gap-4">
                        <span className="flex items-center justify-between">
                            <Icon className="size-5 text-accent" strokeWidth={1.25} />
                            <span className="text-2xs tracking-label text-faint tabular-nums">{String(position + 1).padStart(2, '0')}</span>
                        </span>
                        <p className="pt-2 font-display text-2xl">{benefit.title}</p>
                        <p className="max-w-xs text-sm leading-relaxed text-muted">{benefit.text}</p>
                    </RevealItem>
                );
            })}
        </RevealGroup>
    );
}
