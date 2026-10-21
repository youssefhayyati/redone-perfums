import type { Query } from '@shared/http';

/**
 * Shop filters live in the URL (French parameter names, prices in dirhams) so that
 * results can be shared and the back button works. The API takes centimes.
 */
export interface ShopFilters {
    q: string;
    families: string[];
    collections: string[];
    sizes: number[];
    minPrice: number | null;
    maxPrice: number | null;
    sort: string;
    page: number;
}

export const SORT_LABELS: Record<string, string> = {
    featured: 'Sélection de la maison',
    newest: 'Nouveautés',
    popular: 'Meilleures ventes',
    price_asc: 'Prix croissant',
    price_desc: 'Prix décroissant',
};

const list = (value: string | null) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

const positiveInt = (value: string | null): number | null => {
    const parsed = Number(value);

    return value !== null && value !== '' && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export function readFilters(params: URLSearchParams): ShopFilters {
    return {
        q: params.get('q') ?? '',
        families: list(params.get('famille')),
        collections: list(params.get('collection')),
        sizes: list(params.get('contenance')).map(Number).filter((size) => Number.isInteger(size) && size > 0),
        minPrice: positiveInt(params.get('prix_min')),
        maxPrice: positiveInt(params.get('prix_max')),
        sort: params.get('tri') && SORT_LABELS[params.get('tri')!] ? params.get('tri')! : 'featured',
        page: Math.max(1, positiveInt(params.get('page')) ?? 1),
    };
}

export function writeFilters(filters: ShopFilters): URLSearchParams {
    const params = new URLSearchParams();
    const set = (key: string, value: string | number | null) => {
        if (value !== null && value !== '') {
            params.set(key, String(value));
        }
    };

    set('q', filters.q.trim());
    set('famille', filters.families.join(','));
    set('collection', filters.collections.join(','));
    set('contenance', filters.sizes.join(','));
    set('prix_min', filters.minPrice);
    set('prix_max', filters.maxPrice);
    set('tri', filters.sort === 'featured' ? null : filters.sort);
    set('page', filters.page > 1 ? filters.page : null);

    return params;
}

export function toApiQuery(filters: ShopFilters, perPage: number): Query {
    return {
        q: filters.q.trim(),
        family: filters.families,
        collection: filters.collections,
        size: filters.sizes,
        min_price: filters.minPrice !== null ? filters.minPrice * 100 : null,
        max_price: filters.maxPrice !== null ? filters.maxPrice * 100 : null,
        sort: filters.sort,
        page: filters.page,
        per_page: perPage,
    };
}

export function activeFilterCount(filters: ShopFilters): number {
    return filters.families.length + filters.collections.length + filters.sizes.length + (filters.minPrice !== null ? 1 : 0) + (filters.maxPrice !== null ? 1 : 0) + (filters.q.trim() ? 1 : 0);
}

export function toggle<T>(items: T[], item: T): T[] {
    return items.includes(item) ? items.filter((existing) => existing !== item) : [...items, item];
}
