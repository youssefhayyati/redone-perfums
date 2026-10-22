import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { getLocale } from '@shared/locale';
import { App } from './App';
import { ErrorPage } from './pages/ErrorPage';

type PageModule = { default: ComponentType };

const page = (load: () => Promise<PageModule>): Pick<RouteObject, 'lazy'> => ({
    lazy: async () => ({ Component: (await load()).default }),
});

/**
 * Keep in sync with App\Http\Controllers\SpaController::isKnownRoute(), which serves
 * these paths with a 200 and everything else with a 404.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        Component: App,
        ErrorBoundary: ErrorPage,
        // Shown while the first page's code loads; the canvas colour is already painted.
        HydrateFallback: () => null,
        children: [
            { index: true, ...page(() => import('./pages/HomePage')) },
            { path: 'boutique', ...page(() => import('./pages/ShopPage')) },
            { path: 'parfums/:slug', ...page(() => import('./pages/ProductPage')) },
            { path: 'collections', ...page(() => import('./pages/CollectionsPage')) },
            { path: 'collections/:slug', ...page(() => import('./pages/CollectionPage')) },
            { path: 'decouvrir', ...page(() => import('./pages/DiscoverPage')) },
            { path: 'coffrets', ...page(() => import('./pages/PacksPage')) },
            { path: 'coffrets/:slug', ...page(() => import('./pages/PackPage')) },
            { path: 'pages/:slug', ...page(() => import('./pages/ContentPage')) },
            { path: 'panier', ...page(() => import('./pages/CartPage')) },
            { path: 'commande', ...page(() => import('./pages/CheckoutPage')) },
            { path: 'commande/confirmation/:reference', ...page(() => import('./pages/ConfirmationPage')) },
            { path: 'compte', ...page(() => import('./pages/account/AccountPage')) },
            { path: 'compte/commandes/:reference', ...page(() => import('./pages/account/AccountOrderPage')) },
            { path: 'compte/connexion', ...page(() => import('./pages/account/LoginPage')) },
            { path: 'compte/inscription', ...page(() => import('./pages/account/RegisterPage')) },
            { path: 'compte/mot-de-passe-oublie', ...page(() => import('./pages/account/ForgotPasswordPage')) },
            { path: 'compte/reinitialiser', ...page(() => import('./pages/account/ResetPasswordPage')) },
            { path: '*', ...page(() => import('./pages/NotFoundPage')) },
        ],
    },
];

/** Arabic and English pages live under /ar and /en: internal links ("/boutique") stay in the page's language. */
export function createRouter() {
    const locale = getLocale();

    return createBrowserRouter(routes, { basename: locale === 'fr' ? '/' : `/${locale}` });
}
