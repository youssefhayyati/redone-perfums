<?php

namespace App\Support;

use Illuminate\Support\Facades\App;

/**
 * The storefront's three languages. French is the store's own language (the original
 * columns, the admin, the store's e-mails) and is served without a prefix; Arabic and
 * English are offered to customers under /ar and /en, each with its own `_ar` / `_en`
 * columns and settings that fall back to French while empty.
 */
final class Locale
{
    public const FRENCH = 'fr';

    public const ARABIC = 'ar';

    public const ENGLISH = 'en';

    /** @var list<string> */
    public const SUPPORTED = [self::FRENCH, self::ARABIC, self::ENGLISH];

    /** The languages written beside the French original, e.g. `name_ar`, `name_en`. @var list<string> */
    public const TRANSLATED = [self::ARABIC, self::ENGLISH];

    public static function isSupported(?string $locale): bool
    {
        return in_array($locale, self::SUPPORTED, true);
    }

    public static function isArabic(): bool
    {
        return App::getLocale() === self::ARABIC;
    }

    /** "ar" or "en" on translated requests, null on French ones (the original columns). */
    public static function translation(): ?string
    {
        $locale = App::getLocale();

        return in_array($locale, self::TRANSLATED, true) ? $locale : null;
    }

    public static function isRightToLeft(string $locale): bool
    {
        return $locale === self::ARABIC;
    }

    /** The storefront URL of a path in the given language: "/boutique", "/ar/boutique" or "/en/boutique". */
    public static function path(string $path, string $locale): string
    {
        $path = '/'.ltrim($path, '/');

        if (! in_array($locale, self::TRANSLATED, true)) {
            return $path;
        }

        return $path === '/' ? '/'.$locale : '/'.$locale.$path;
    }

    /**
     * The language of a storefront path and the path without its prefix:
     * "ar/boutique" → ["ar", "boutique"], "boutique" → ["fr", "boutique"].
     *
     * @return array{0: string, 1: string}
     */
    public static function fromPath(string $path): array
    {
        $path = trim($path, '/');

        foreach (self::TRANSLATED as $locale) {
            if ($path === $locale || str_starts_with($path, $locale.'/')) {
                return [$locale, substr($path, strlen($locale) + 1) ?: ''];
            }
        }

        return [self::FRENCH, $path];
    }
}
