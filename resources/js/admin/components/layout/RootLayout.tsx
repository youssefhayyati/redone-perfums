import { useEffect, useState } from 'react';
import { Outlet, ScrollRestoration, isRouteErrorResponse, useNavigation, useRouteError } from 'react-router';
import { MotionConfig } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { ToastViewport } from '../ui/toast';
import { Button } from '../ui/Button';
import { Wordmark } from './Sidebar';

/** Thin bar while a lazily loaded screen is being fetched. */
function NavigationProgress() {
    const navigation = useNavigation();
    const busy = navigation.state !== 'idle';
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!busy) {
            setVisible(false);

            return;
        }
        const timer = window.setTimeout(() => setVisible(true), 150);

        return () => window.clearTimeout(timer);
    }, [busy]);

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-accent/15" aria-hidden>
            <div className="h-full w-1/3 animate-[admin-progress_1s_ease-in-out_infinite] bg-accent" />
        </div>
    );
}

export function RootLayout() {
    return (
        <MotionConfig reducedMotion="user">
            <NavigationProgress />
            <Outlet />
            <ToastViewport />
            <ScrollRestoration />
        </MotionConfig>
    );
}

/** Last-resort boundary: render errors and failed chunk loads (e.g. after a deploy). */
export function RootError() {
    const error = useRouteError();
    const status = isRouteErrorResponse(error) ? error.status : null;
    const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas p-6 text-center">
            <Wordmark />
            <div className="max-w-md">
                <h1 className="text-lg font-semibold text-ink">{status === 404 ? 'Page introuvable' : 'Une erreur inattendue est survenue'}</h1>
                <p className="mt-2 text-sm text-muted">
                    {chunkFailed
                        ? 'Une nouvelle version de l’administration est disponible. Rechargez la page pour continuer.'
                        : 'Rechargez la page. Si le problème persiste, contactez la personne en charge du site.'}
                </p>
            </div>
            <Button variant="primary" icon={RotateCcw} onClick={() => window.location.reload()}>
                Recharger la page
            </Button>
        </div>
    );
}
