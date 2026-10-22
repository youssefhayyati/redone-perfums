import { describe, expect, it } from 'vitest';
import { coordinatesFromMapsLink, directionsUrl, mapEmbedUrl, parseGeoPoint } from './maps';

describe('parseGeoPoint', () => {
    it.each([
        ['33.5899, -7.6039', { lat: 33.5899, lng: -7.6039 }],
        ['33.5899,-7.6039', { lat: 33.5899, lng: -7.6039 }],
        ['  -33.9 , 151.2 ', { lat: -33.9, lng: 151.2 }],
    ])('reads "%s"', (input, expected) => {
        expect(parseGeoPoint(input)).toEqual(expected);
    });

    it.each(['Casablanca', '33.5899', '95, -7.6', '33.5, 181', '33,5899; -7,6039', ''])('rejects "%s"', (input) => {
        expect(parseGeoPoint(input)).toBeNull();
    });
});

describe('coordinatesFromMapsLink', () => {
    it("prefers the place's pin over the view's centre", () => {
        const link = 'https://www.google.com/maps/place/Twin+Center/@33.5880,-7.6330,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d33.5883!4d-7.6315';
        expect(coordinatesFromMapsLink(link)).toBe('33.5883, -7.6315');
    });

    it('reads searches, routes and centred views', () => {
        expect(coordinatesFromMapsLink('https://maps.google.com/?q=33.5899,-7.6039')).toBe('33.5899, -7.6039');
        expect(coordinatesFromMapsLink('https://www.google.com/maps/search/?api=1&query=33.5899%2C-7.6039')).toBe('33.5899, -7.6039');
        expect(coordinatesFromMapsLink('https://www.google.com/maps/@34.0209,-6.8416,15z')).toBe('34.0209, -6.8416');
    });

    it('leaves typed coordinates, short links and other text unchanged', () => {
        expect(coordinatesFromMapsLink('33.58')).toBe('33.58');
        expect(coordinatesFromMapsLink('https://maps.app.goo.gl/x1Y2z3')).toBe('https://maps.app.goo.gl/x1Y2z3');
    });
});

describe('map links', () => {
    it('embeds the map in the page language and routes to the shop', () => {
        const shop = { lat: 33.5899, lng: -7.6039 };
        expect(mapEmbedUrl(shop, 16, 'ar')).toBe('https://maps.google.com/maps?q=33.5899,-7.6039&z=16&hl=ar&output=embed');
        expect(directionsUrl(shop)).toBe('https://www.google.com/maps/dir/?api=1&destination=33.5899,-7.6039');
    });
});
