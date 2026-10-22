<?php

namespace App\Support;

/**
 * A map position typed as "latitude, longitude", the form Google Maps copies when the
 * place is right-clicked (e.g. "33.5899, -7.6039").
 */
final class GeoPoint
{
    /**
     * @return array{lat: float, lng: float}|null
     */
    public static function parse(?string $input): ?array
    {
        if ($input === null || preg_match('/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/', $input, $m) !== 1) {
            return null;
        }

        $lat = (float) $m[1];
        $lng = (float) $m[2];

        if (abs($lat) > 90 || abs($lng) > 180) {
            return null;
        }

        return ['lat' => $lat, 'lng' => $lng];
    }
}
