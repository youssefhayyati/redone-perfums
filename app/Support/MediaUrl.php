<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stored media paths are either public assets shipped with the app ("/images/…")
 * or files on the public disk ("products/…").
 */
final class MediaUrl
{
    public static function for(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        if (Str::startsWith($path, '/')) {
            return asset(ltrim($path, '/'));
        }

        return Storage::disk('public')->url($path);
    }
}
