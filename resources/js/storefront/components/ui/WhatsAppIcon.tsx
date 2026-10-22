import type { SVGProps } from 'react';

/**
 * WhatsApp's mark drawn like the rest of the storefront's icons (lucide outlines): the
 * chat bubble with its tail at the bottom left, a handset inside. The handset keeps the
 * same stroke width although it is drawn smaller.
 */
export function WhatsAppIcon({ strokeWidth = 1.25, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
            <path
                transform="translate(12 12) scale(0.42) translate(-12 -12)"
                vectorEffect="non-scaling-stroke"
                d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
            />
        </svg>
    );
}
