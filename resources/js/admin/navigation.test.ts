import { describe, expect, it } from 'vitest';
import { NAVIGATION, filterNavigation, firstAllowedPath, safeRedirect, toRouterPath } from './navigation';
import type { Permission } from './types';

const ADMIN: Permission[] = ['view-dashboard', 'view-revenue', 'manage-catalog', 'manage-orders', 'view-customers', 'manage-promotions', 'manage-content', 'manage-settings', 'manage-team'];
const MANAGER: Permission[] = ['view-dashboard', 'view-revenue', 'manage-catalog', 'manage-orders', 'view-customers', 'manage-promotions', 'manage-content'];
const SUPPORT: Permission[] = ['view-dashboard', 'manage-orders', 'view-customers'];

const paths = (permissions: Permission[]) => filterNavigation(NAVIGATION, permissions).flatMap((section) => section.items.map((item) => item.to));

describe('filterNavigation', () => {
    it('shows every screen to administrators', () => {
        expect(paths(ADMIN)).toEqual(NAVIGATION.flatMap((section) => section.items.map((item) => item.to)));
    });

    it('hides settings, delivery and team from managers', () => {
        const visible = paths(MANAGER);
        expect(visible).toContain('/produits');
        expect(visible).toContain('/codes-promo');
        expect(visible).not.toContain('/reglages');
        expect(visible).not.toContain('/livraison');
        expect(visible).not.toContain('/equipe');
    });

    it('limits support staff to the dashboard, orders and customers and drops empty sections', () => {
        const sections = filterNavigation(NAVIGATION, SUPPORT);
        expect(paths(SUPPORT)).toEqual(['/', '/commandes', '/clients']);
        expect(sections.map((section) => section.label)).toEqual(['Pilotage', 'Ventes']);
    });

    it('returns nothing without permissions', () => {
        expect(filterNavigation(NAVIGATION, [])).toEqual([]);
    });
});

describe('firstAllowedPath', () => {
    it('is the dashboard when allowed, else the first permitted screen', () => {
        expect(firstAllowedPath(SUPPORT)).toBe('/');
        expect(firstAllowedPath(['manage-orders'])).toBe('/commandes');
        expect(firstAllowedPath([])).toBeNull();
    });
});

describe('toRouterPath', () => {
    it('strips the /admin basename from API links', () => {
        expect(toRouterPath('/admin/reglages')).toBe('/reglages');
        expect(toRouterPath('/admin')).toBe('/');
        expect(toRouterPath('/produits')).toBe('/produits');
        expect(toRouterPath('/administration')).toBe('/administration');
    });
});

describe('safeRedirect', () => {
    it('keeps internal paths only', () => {
        expect(safeRedirect('/commandes?status=pending')).toBe('/commandes?status=pending');
        expect(safeRedirect('//evil.example')).toBe('/');
        expect(safeRedirect('https://evil.example')).toBe('/');
        expect(safeRedirect('/\\evil.example')).toBe('/');
        expect(safeRedirect('/connexion')).toBe('/');
        expect(safeRedirect(null)).toBe('/');
    });
});
