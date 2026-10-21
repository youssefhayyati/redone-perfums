import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router';
import { RotateCcw, ShieldX, WifiOff } from 'lucide-react';
import { firstAllowedPath } from '../../navigation';
import { retrySession, useSession } from '../../session';
import type { Permission } from '../../types';
import { usePendingOrders } from '../../hooks/usePendingOrders';
import { Button, ButtonLink } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/feedback';
import { SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';
import { Splash } from './Splash';

/** Route `handle` used by the shell to guard screens. */
export interface RouteHandle {
    permission?: Permission;
}

function requiredPermission(matches: ReturnType<typeof useMatches>): Permission | undefined {
    for (let index = matches.length - 1; index >= 0; index--) {
        const handle = matches[index]!.handle as RouteHandle | undefined;
        if (handle?.permission) {
            return handle.permission;
        }
    }

    return undefined;
}

export function AccessDenied() {
    return (
        <EmptyState
            className="py-24"
            as="h1"
            icon={ShieldX}
            title="Accès refusé"
            description="Votre rôle ne permet pas d’ouvrir cette section. Demandez l’accès à un administrateur si vous en avez besoin."
            action={
                <ButtonLink to="/" size="sm">
                    Retour au tableau de bord
                </ButtonLink>
            }
        />
    );
}

/**
 * Authenticated area: sidebar (drawer below lg), top bar and the routed screen. It
 * redirects guests to the sign-in screen with the current path to come back to, and
 * renders "Accès refusé" for screens the role may not open.
 */
export function AdminShell() {
    const session = useSession();
    const location = useLocation();
    const matches = useMatches();
    const [navigationOpen, setNavigationOpen] = useState(false);
    const firstRender = useRef(true);
    const user = session.user;
    const pendingOrders = usePendingOrders(user?.permissions.includes('manage-orders') ?? false);

    useEffect(() => {
        setNavigationOpen(false);

        // Move focus to the new screen on in-app navigation (not on the first load).
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }
        document.getElementById('main')?.focus({ preventScroll: true });
    }, [location.pathname]);

    if (session.status === 'unknown') {
        return <Splash />;
    }

    if (session.status === 'error') {
        return (
            <div className="flex min-h-dvh items-center justify-center p-6">
                <EmptyState
                    icon={WifiOff}
                    title="Administration indisponible"
                    description={session.error ?? 'Impossible de joindre le serveur.'}
                    action={
                        <Button icon={RotateCcw} onClick={() => void retrySession()}>
                            Réessayer
                        </Button>
                    }
                />
            </div>
        );
    }

    if (session.status === 'guest' || user === null) {
        const target = location.pathname + location.search;
        const destination = target === '/' ? '/connexion' : `/connexion?redirect=${encodeURIComponent(target)}`;

        return <Navigate to={destination} replace />;
    }

    const permission = requiredPermission(matches);
    const allowed = permission === undefined || user.permissions.includes(permission);

    if (!allowed && permission === 'view-dashboard') {
        const fallback = firstAllowedPath(user.permissions);
        if (fallback && fallback !== '/') {
            return <Navigate to={fallback} replace />;
        }
    }

    const badges = { '/commandes': pendingOrders ?? undefined };

    return (
        <div className="min-h-dvh">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-lg focus:border focus:border-line-strong focus:bg-raised focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
            >
                Aller au contenu
            </a>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-canvas lg:block">
                <SidebarContent permissions={user.permissions} badges={badges} />
            </aside>
            <Drawer open={navigationOpen} onClose={() => setNavigationOpen(false)} side="left" title="Navigation" labelHidden width="max-w-72">
                <SidebarContent permissions={user.permissions} badges={badges} />
            </Drawer>
            <div className="lg:pl-60">
                <Topbar user={user} onOpenNavigation={() => setNavigationOpen(true)} navigationOpen={navigationOpen} />
                <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
                    {allowed ? <Outlet /> : <AccessDenied />}
                </main>
            </div>
        </div>
    );
}
