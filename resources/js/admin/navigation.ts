import {
    Boxes,
    FileText,
    FlaskConical,
    Gift,
    LayoutDashboard,
    LayoutGrid,
    Layers,
    Mail,
    Package,
    Settings,
    ShoppingBag,
    TicketPercent,
    Truck,
    UserCog,
    Users,
    type LucideIcon,
} from 'lucide-react';
import type { Permission } from './types';

/**
 * The sidebar, and the permission each screen requires. Routes use the same
 * permissions (see routes.tsx), so a hidden entry is also a guarded URL.
 */
export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    permission: Permission;
    /** Only active on an exact match (the dashboard). */
    end?: boolean;
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
    {
        label: 'Pilotage',
        items: [{ to: '/', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'view-dashboard', end: true }],
    },
    {
        label: 'Ventes',
        items: [
            { to: '/commandes', label: 'Commandes', icon: ShoppingBag, permission: 'manage-orders' },
            { to: '/clients', label: 'Clients', icon: Users, permission: 'view-customers' },
        ],
    },
    {
        label: 'Catalogue',
        items: [
            { to: '/produits', label: 'Produits', icon: Package, permission: 'manage-catalog' },
            { to: '/familles', label: 'Familles olfactives', icon: Layers, permission: 'manage-catalog' },
            { to: '/collections', label: 'Collections', icon: LayoutGrid, permission: 'manage-catalog' },
            { to: '/coffrets', label: 'Coffrets', icon: Gift, permission: 'manage-catalog' },
            { to: '/stock', label: 'Stock', icon: Boxes, permission: 'manage-catalog' },
        ],
    },
    {
        label: 'Marketing',
        items: [
            { to: '/codes-promo', label: 'Codes promo', icon: TicketPercent, permission: 'manage-promotions' },
            { to: '/newsletter', label: 'Newsletter', icon: Mail, permission: 'manage-content' },
            { to: '/pages', label: 'Pages', icon: FileText, permission: 'manage-content' },
            { to: '/laboratoire', label: 'Laboratoire', icon: FlaskConical, permission: 'manage-content' },
        ],
    },
    {
        label: 'Boutique',
        items: [
            { to: '/livraison', label: 'Livraison', icon: Truck, permission: 'manage-settings' },
            { to: '/reglages', label: 'Réglages', icon: Settings, permission: 'manage-settings' },
            { to: '/equipe', label: 'Équipe', icon: UserCog, permission: 'manage-team' },
        ],
    },
];

/** Drops the entries the user may not open, then the sections left empty. */
export function filterNavigation(sections: NavSection[], permissions: readonly Permission[]): NavSection[] {
    return sections
        .map((section) => ({ ...section, items: section.items.filter((item) => permissions.includes(item.permission)) }))
        .filter((section) => section.items.length > 0);
}

/** Where to land when the dashboard is not available to this role. */
export function firstAllowedPath(permissions: readonly Permission[]): string | null {
    return filterNavigation(NAVIGATION, permissions)[0]?.items[0]?.to ?? null;
}

/**
 * Turns an absolute admin URL from the API ("/admin/reglages") into a router path
 * ("/reglages"). Other values are returned unchanged.
 */
export function toRouterPath(link: string, basename = '/admin'): string {
    if (link === basename) {
        return '/';
    }

    return link.startsWith(`${basename}/`) ? link.slice(basename.length) : link;
}

/**
 * Validates the `redirect` query parameter of the sign-in screen: only paths inside
 * the admin are followed (no protocol-relative or external URLs).
 */
export function safeRedirect(target: string | null | undefined): string {
    if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\') || target.startsWith('/connexion')) {
        return '/';
    }

    return target;
}
