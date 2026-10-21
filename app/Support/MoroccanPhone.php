<?php

namespace App\Support;

/**
 * Moroccan numbers: 0X XX XX XX XX, +212 X XX XX XX XX or 00212…, where X is 5 (fixed),
 * 6 or 7 (mobile). Stored in E.164 (+212XXXXXXXXX).
 */
final class MoroccanPhone
{
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $digits = preg_replace('/[\s\-\.\(\)]/', '', trim($input)) ?? '';

        if (preg_match('/^(?:\+212|00212|212|0)([567]\d{8})$/', $digits, $m) !== 1) {
            return null;
        }

        return '+212'.$m[1];
    }

    public static function isValid(?string $input): bool
    {
        return self::normalize($input) !== null;
    }

    /** "+212612345678" → "06 12 34 56 78" */
    public static function format(string $e164): string
    {
        $national = '0'.substr($e164, 4);

        return trim(chunk_split($national, 2, ' '));
    }
}
