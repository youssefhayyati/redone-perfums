import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AdminShell, type RouteHandle } from './components/layout/AdminShell';
import { RootError, RootLayout } from './components/layout/RootLayout';
import { Splash } from './components/layout/Splash';
import type { Permission } from './types';

/** Code-split screen: the module's default export becomes the route component. */
function screen(load: () => Promise<{ default: ComponentType }>) {
    return async () => ({ Component: (await load()).default });
}

function guarded(permission: Permission, path: string, load: () => Promise<{ default: ComponentType }>): RouteObject {
    return { path, lazy: screen(load), handle: { permission } satisfies RouteHandle };
}

export const routes: RouteObject[] = [
    {
        path: '/',
        Component: RootLayout,
        HydrateFallback: Splash,
        ErrorBoundary: RootError,
        children: [
            { path: 'connexion', lazy: screen(() => import('./pages/LoginPage')) },
            {
                Component: AdminShell,
                children: [
                    { index: true, lazy: screen(() => import('./pages/dashboard/DashboardPage')), handle: { permission: 'view-dashboard' } satisfies RouteHandle },

                    guarded('manage-orders', 'commandes', () => import('./pages/orders/OrdersPage')),
                    {
                        path: 'commandes/bons',
                        lazy: screen(() => import('./pages/orders/DeliverySlipsPage')),
                        handle: { permission: 'manage-orders', bare: true } satisfies RouteHandle,
                    },
                    guarded('manage-orders', 'commandes/:reference', () => import('./pages/orders/OrderDetailPage')),

                    guarded('manage-catalog', 'produits', () => import('./pages/products/ProductsPage')),
                    guarded('manage-catalog', 'produits/nouveau', () => import('./pages/products/ProductFormPage')),
                    guarded('manage-catalog', 'produits/:id', () => import('./pages/products/ProductFormPage')),
                    guarded('manage-catalog', 'familles', () => import('./pages/FamiliesPage')),
                    guarded('manage-catalog', 'collections', () => import('./pages/collections/CollectionsPage')),
                    guarded('manage-catalog', 'collections/nouvelle', () => import('./pages/collections/CollectionFormPage')),
                    guarded('manage-catalog', 'collections/:id', () => import('./pages/collections/CollectionFormPage')),
                    guarded('manage-catalog', 'coffrets', () => import('./pages/packs/PacksPage')),
                    guarded('manage-catalog', 'coffrets/nouveau', () => import('./pages/packs/PackFormPage')),
                    guarded('manage-catalog', 'coffrets/:id', () => import('./pages/packs/PackFormPage')),
                    guarded('manage-catalog', 'stock', () => import('./pages/StockPage')),

                    guarded('view-customers', 'clients', () => import('./pages/customers/CustomersPage')),
                    guarded('view-customers', 'clients/:id', () => import('./pages/customers/CustomerDetailPage')),

                    guarded('manage-promotions', 'codes-promo', () => import('./pages/CouponsPage')),
                    guarded('manage-content', 'pages', () => import('./pages/ContentPagesPage')),
                    guarded('manage-content', 'laboratoire', () => import('./pages/LabPage')),
                    guarded('manage-content', 'newsletter', () => import('./pages/NewsletterPage')),

                    guarded('manage-settings', 'livraison', () => import('./pages/DeliveryPage')),
                    guarded('manage-settings', 'reglages', () => import('./pages/SettingsPage')),
                    guarded('manage-team', 'equipe', () => import('./pages/TeamPage')),

                    { path: '*', lazy: screen(() => import('./pages/NotFoundPage')) },
                ],
            },
        ],
    },
];

export function createAdminRouter() {
    return createBrowserRouter(routes, { basename: '/admin' });
}
