import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { applyThemeColor } from '@shared/theme';
import { CartDrawer } from './components/cart/CartDrawer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { MobileMenu } from './components/layout/MobileMenu';
import { RouteAnnouncer, RouteProgress } from './components/layout/RouteFeedback';
import { SearchOverlay } from './components/layout/SearchOverlay';
import { Toaster } from './components/ui/Toaster';
import { MotionProvider } from './motion/MotionProvider';
import { cartActions } from './stores/cart';
import { sessionActions } from './stores/session';
import { ui } from './stores/ui';
import { t } from './i18n';

export function App() {
    const { pathname } = useLocation();

    useEffect(() => {
        applyThemeColor();
        void cartActions.load();
        void sessionActions.load();
    }, []);

    // Overlays never survive a page change.
    useEffect(() => {
        ui.close();
    }, [pathname]);

    return (
        <MotionProvider>
            <a href="#main" className="sr-only z-[80] bg-accent px-4 py-3 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                {t('Aller au contenu')}
            </a>
            <div className="flex min-h-dvh flex-col">
                <AnnouncementBar />
                <Header />
                <main id="main" tabIndex={-1} className="flex-1 outline-none">
                    <Outlet />
                </main>
                <Footer />
            </div>
            <CartDrawer />
            <SearchOverlay />
            <MobileMenu />
            <Toaster />
            <RouteProgress />
            <RouteAnnouncer />
            <ScrollRestoration />
        </MotionProvider>
    );
}
