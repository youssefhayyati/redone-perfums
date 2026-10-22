import type { ReactNode } from 'react';
import { cn } from '@shared/format';
import {
    AVAILABILITY_LABELS,
    AVAILABILITY_TONES,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_TONES,
    PAYMENT_STATUS_LABELS,
    PAYMENT_STATUS_TONES,
    PRODUCT_STATUS_LABELS,
    PRODUCT_STATUS_TONES,
    type Tone,
} from '../../lib/status';
import type { Availability, OrderStatus, PaymentStatus, ProductStatus } from '../../types';

const TONES: Record<Tone, string> = {
    neutral: 'border-line-strong text-muted',
    muted: 'border-line text-muted',
    accent: 'border-accent/35 bg-accent/10 text-accent',
    ink: 'border-ink/25 bg-ink/[0.07] text-ink',
    success: 'border-success/35 bg-success/10 text-success',
    warning: 'border-warning/35 bg-warning/10 text-warning',
    danger: 'border-danger/35 bg-danger/10 text-danger',
};

export function Badge({ tone = 'neutral', dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-px text-xs font-medium leading-5',
                TONES[tone],
                className,
            )}
        >
            {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
            {children}
        </span>
    );
}

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
    return (
        <Badge tone={ORDER_STATUS_TONES[status]} dot>
            {label ?? ORDER_STATUS_LABELS[status]}
        </Badge>
    );
}

export function PaymentStatusBadge({ status, label }: { status: PaymentStatus; label?: string }) {
    return <Badge tone={PAYMENT_STATUS_TONES[status]}>{label ?? PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
    return (
        <Badge tone={PRODUCT_STATUS_TONES[status]} dot>
            {PRODUCT_STATUS_LABELS[status]}
        </Badge>
    );
}

export function AvailabilityBadge({ availability }: { availability: Availability }) {
    return (
        <Badge tone={AVAILABILITY_TONES[availability]} dot>
            {AVAILABILITY_LABELS[availability]}
        </Badge>
    );
}
