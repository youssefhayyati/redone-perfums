<?php

namespace App\Support;

use Illuminate\Support\Facades\App;

/**
 * The storefront's two languages. French is the store's own language (the original
 * columns, the admin, the store's e-mails); Arabic is offered to customers under /ar.
 */
final class Locale
{
    public const FRENCH = 'fr';

    public const ARABIC = 'ar';

    /** @var list<string> */
    public const SUPPORTED = [self::FRENCH, self::ARABIC];

    public static function isSupported(?string $locale): bool
    {
        return in_array($locale, self::SUPPORTED, true);
    }

    public static function isArabic(): bool
    {
        return App::getLocale() === self::ARABIC;
    }

    /** The storefront URL of a path in the given language: "/boutique" or "/ar/boutique". */
    public static function path(string $path, string $locale): string
    {
        $path = '/'.ltrim($path, '/');

        if ($locale !== self::ARABIC) {
            return $path;
        }

        return $path === '/' ? '/ar' : '/ar'.$path;
    }
}
