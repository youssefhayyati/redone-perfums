<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Image paths saved on records must come from our own upload endpoint (public disk,
 * "uploads/…webp") or from assets shipped with the app ("/images/…"). This blocks
 * path traversal and arbitrary external URLs.
 */
class ManagedImagePath implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $valid = is_string($value) && (
            preg_match('#^uploads/[a-z]+/[a-z0-9]+\.webp$#', $value) === 1
            || preg_match('#^/images/[A-Za-z0-9/_\-]+\.(svg|webp|jpg|png)$#', $value) === 1
        );

        if (! $valid || str_contains((string) $value, '..')) {
            $fail('Chemin d’image invalide.');
        }
    }
}
