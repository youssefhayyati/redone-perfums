import type { ReactNode } from 'react';
import { LogoMark } from '@shared/LogoMark';
import { Reveal, RevealWords } from '../../motion/Reveal';

/**
 * Narrow centred column used by the sign-in, sign-up and password pages: the house
 * mark and a title, then the form on a card.
 */
export function AuthLayout({ eyebrow, title, intro, children, footer }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="container-page flex justify-center pt-12 sm:pt-20">
            <div className="flex w-full max-w-md flex-col gap-8">
                <header className="flex flex-col items-center gap-4 text-center">
                    <LogoMark className="mb-2 size-10 text-ink" />
                    <p className="eyebrow">{eyebrow}</p>
                    <RevealWords as="h1" text={title} className="font-display text-display-md font-normal text-balance" />
                    {intro && <div className="text-muted">{intro}</div>}
                </header>
                <Reveal delay={0.15} className="rounded-card border border-line bg-raised p-6 sm:p-8">
                    {children}
                </Reveal>
                {footer && <div className="text-center text-sm text-muted">{footer}</div>}
            </div>
        </div>
    );
}

/** Validation message for a field, from a Laravel error bag. */
export function fieldError(errors: Record<string, string[]> | undefined, field: string): string | undefined {
    return errors?.[field]?.[0];
}

/** Only internal paths are accepted as post-login destinations. */
export function safeRedirect(target: string | null, fallback = '/compte'): string {
    return target && target.startsWith('/') && !target.startsWith('//') ? target : fallback;
}
