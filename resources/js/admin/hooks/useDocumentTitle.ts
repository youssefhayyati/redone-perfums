import { useEffect } from 'react';

/** The shell's own title ("Administration — Myperfum"), captured once at boot. */
const baseTitle = typeof document !== 'undefined' ? document.title : 'Administration';

/** "Commandes · Administration — Myperfum" while the screen is shown. */
export function useDocumentTitle(title: string | null | undefined): void {
    useEffect(() => {
        document.title = title ? `${title} · ${baseTitle}` : baseTitle;
    }, [title]);
}
