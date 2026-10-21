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
        <RevealGroup as="ul" className={cn('grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2', benefits.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3', className)}>
            {benefits.map((benefit) => {
                const Icon = ICONS[benefit.icon] ?? Sparkles;

                return (
                    <RevealItem as="li" key={benefit.title} className="flex flex-col gap-4 bg-canvas p-7 sm:p-8">
                        <Icon className="size-5 text-accent" strokeWidth={1.25} />
                        <p className="font-display text-xl">{benefit.title}</p>
                        <p className="text-sm leading-relaxed text-muted">{benefit.text}</p>
                    </RevealItem>
                );
            })}
        </RevealGroup>
    );
}
