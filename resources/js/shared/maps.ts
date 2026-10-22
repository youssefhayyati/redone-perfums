import type { Locale } from './locale';

/**
 * The shop's position on Google Maps. Coordinates are stored as "latitude, longitude",
 * the form Google Maps copies when a place is right-clicked.
 */
export interface GeoPoint {
    lat: number;
    lng: number;
}

/** "33.5899, -7.6039" → { lat, lng }; null unless both numbers are on the globe. */
export function parseGeoPoint(input: string): GeoPoint | null {
    const match = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(input);
    if (!match) {
        return null;
    }
    const lat = Number(match[1]);
    const lng = Number(match[2]);

    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/**
 * Coordinates from a pasted Google Maps address, as "latitude, longitude": the place's
 * pin (`!3d…!4d…`), a search or route (`?q=`, `query=`, `ll=`, `destination=`) or else the
 * view's centre (`@lat,lng`). Anything else, short links included, comes back unchanged.
 */
export function coordinatesFromMapsLink(input: string): string {
    const text = decodeURIComponent(input.trim().replace(/\+/g, ' '));
    if (!/^https?:\/\//i.test(text)) {
        return input;
    }
    const number = '(-?\\d{1,3}\\.\\d+)';
    const match =
        new RegExp(`!3d${number}!4d${number}`).exec(text) ??
        new RegExp(`[?&](?:q|query|ll|destination)=${number},\\s*${number}`).exec(text) ??
        new RegExp(`@${number},${number}`).exec(text);

    return match ? `${Number(match[1])}, ${Number(match[2])}` : input;
}

/** Google Maps map for an iframe, with a pin on the shop, in the page's language. */
export function mapEmbedUrl(point: GeoPoint, zoom: number, locale: Locale): string {
    return `https://maps.google.com/maps?q=${point.lat},${point.lng}&z=${zoom}&hl=${locale}&output=embed`;
}

/** Opens Google Maps (the app on phones) with a route to the shop. */
export function directionsUrl(point: GeoPoint): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
}
