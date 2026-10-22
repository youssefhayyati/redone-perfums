<?php

namespace App\Support;

/**
 * Amounts are stored as integer centimes (1 DH = 100 centimes). Formats them exactly as
 * the storefront does (resources/js/shared/money.ts), so e-mails and pages agree.
 */
final class Money
{
    /** French thousands separator: a narrow no-break space, as Intl writes it. */
    private const THOUSANDS_SEPARATOR = "\u{202F}";

    /** 125000 → "1 250 DH"; 125050 → "1 250,50 DH". */
    public static function format(int $centimes): string
    {
        $decimals = $centimes % 100 === 0 ? 0 : 2;

        return number_format($centimes / 100, $decimals, ',', self::THOUSANDS_SEPARATOR)."\u{00A0}DH";
    }
}
