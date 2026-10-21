import { describe, expect, it } from 'vitest';
import { activeFilterCount, readFilters, toApiQuery, toggle, writeFilters } from './filters';

describe('shop filters in the URL', () => {
    it('reads French parameters, ignoring invalid values', () => {
        const filters = readFilters(new URLSearchParams('q=rose&famille=ambre,floral&contenance=50,abc,-3&prix_min=400&prix_max=x&tri=nope&page=0'));

        expect(filters).toEqual({
            q: 'rose',
            families: ['ambre', 'floral'],
            collections: [],
            sizes: [50],
            minPrice: 400,
            maxPrice: null,
            sort: 'featured',
            page: 1,
        });
    });

    it('writes only what differs from the defaults and round-trips', () => {
        const params = writeFilters({ q: ' oud ', families: ['boise'], collections: [], sizes: [30, 100], minPrice: null, maxPrice: 900, sort: 'price_asc', page: 2 });

        expect(params.toString()).toBe('q=oud&famille=boise&contenance=30%2C100&prix_max=900&tri=price_asc&page=2');
        expect(readFilters(params)).toMatchObject({ q: 'oud', families: ['boise'], sizes: [30, 100], maxPrice: 900, sort: 'price_asc', page: 2 });
    });

    it('omits the default sort and the first page', () => {
        expect(writeFilters(readFilters(new URLSearchParams('tri=featured&page=1'))).toString()).toBe('');
    });

    it('sends prices to the API in centimes', () => {
        const query = toApiQuery(readFilters(new URLSearchParams('prix_min=400&prix_max=950&famille=ambre')), 12);

        expect(query).toMatchObject({ min_price: 40000, max_price: 95000, family: ['ambre'], per_page: 12, page: 1, sort: 'featured' });
    });

    it('counts active filters', () => {
        expect(activeFilterCount(readFilters(new URLSearchParams('q=x&famille=a,b&prix_min=1')))).toBe(4);
    });

    it('toggles a value in a list', () => {
        expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
        expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    });
});
