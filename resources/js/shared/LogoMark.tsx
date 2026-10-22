import { useId } from 'react';

/**
 * The house mark: a rounded flacon, half full. Outlined in `currentColor` with the
 * perfume in the accent colour, so it follows the theme wherever it is placed.
 * public/favicon.svg is the same drawing on a dark tile.
 */
export function LogoMark({ className }: { className?: string }) {
    const clipId = useId();

    return (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
            <defs>
                <clipPath id={clipId}>
                    <rect x="5" y="11.5" width="22" height="18.5" rx="7.5" />
                </clipPath>
            </defs>
            <rect x="11" y="2" width="10" height="6" rx="2.5" fill="currentColor" />
            <rect x="13.5" y="7.5" width="5" height="4.5" fill="currentColor" />
            <g clipPath={`url(#${clipId})`}>
                <path d="M3 20.5c3.2-2.2 6.8 2.2 10 0s6.8-2.2 10 0 6.8 2.2 10 0V32H3Z" style={{ fill: 'var(--color-accent)' }} />
                <circle cx="20.5" cy="25" r="1.3" opacity="0.55" style={{ fill: 'var(--color-canvas)' }} />
            </g>
            <rect x="5" y="11.5" width="22" height="18.5" rx="7.5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
    );
}
