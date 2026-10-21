import type { ReactNode } from 'react';
import { Reveal } from '../../motion/Reveal';

/** Narrow centred column used by the sign-in, sign-up and password pages. */
export function AuthLayout({ eyebrow, title, intro, children, footer }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="container-page flex justify-center pt-16 sm:pt-24">
            <Reveal className="flex w-full max-w-md flex-col gap-10">
                <header className="flex flex-col gap-4 text-center">
                    <p className="eyebrow">{eyebrow}</p>
                    <h1 className="font-display text-display-md text-balance">{title}</h1>
                    {intro && <div className="text-muted">{intro}</div>}
                </header>
                {children}
                {footer && <div className="border-t border-line pt-8 text-center text-sm text-muted">{footer}</div>}
            </Reveal>
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
