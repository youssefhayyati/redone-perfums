import { useEffect, useLayoutEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { applyThemeColor } from '@shared/theme';
import { initAnalytics, track } from './analytics';
import { CartDrawer } from './components/cart/CartDrawer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { CookieConsent } from './components/layout/CookieConsent';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { MobileMenu } from './components/layout/MobileMenu';
import { RouteAnnouncer, RouteProgress } from './components/layout/RouteFeedback';
import { SearchOverlay } from './components/layout/SearchOverlay';
import { WhatsAppButton } from './components/layout/WhatsAppButton';
import { Toaster } from './components/ui/Toaster';
import { MotionProvider } from './motion/MotionProvider';
import { PageTransition } from './motion/PageTransition';
import { settleSmoothScroll } from './motion/smoothScroll';
import { useConfig } from './config';
import { cartActions } from './stores/cart';
import { sessionActions } from './stores/session';
import { ui } from './stores/ui';
import { t } from './i18n';

export function App() {
    const { pathname, key } = useLocation();
    const config = useConfig();

    useEffect(() => {
        applyThemeColor();
        initAnalytics(config.analytics);
        void cartActions.load();
        void sessionActions.load();
        // The configuration is read once, on load.
    }, []);

    // One page view per page, once its title is set (the full path keeps the /ar prefix).
    useEffect(() => {
        const timer = window.setTimeout(() => track({ type: 'page_view', path: window.location.pathname, title: document.title }), 300);

        return () => window.clearTimeout(timer);
    }, [pathname]);

    // Overlays never survive a page change.
    useEffect(() => {
        ui.close();
    }, [pathname]);

    // An eased scroll still running would carry the new page away from where the router puts it.
    useLayoutEffect(() => {
        settleSmoothScroll();
    }, [key]);

    return (
        <MotionProvider>
            <a href="#main" className="sr-only z-[80] bg-accent px-4 py-3 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                {t('Aller au contenu')}
            </a>
            <div className="flex min-h-dvh flex-col">
                <AnnouncementBar />
                <Header />
                <main id="main" tabIndex={-1} className="flex-1 outline-none">
                    <PageTransition>
                        <Outlet />
                    </PageTransition>
                </main>
                <Footer />
            </div>
            <WhatsAppButton />
            <CartDrawer />
            <SearchOverlay />
            <MobileMenu />
            <Toaster />
            <CookieConsent />
            <RouteProgress />
            <RouteAnnouncer />
            <ScrollRestoration />
        </MotionProvider>
    );
}
