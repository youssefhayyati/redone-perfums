<?php

namespace Tests\Unit\Support;

use App\Support\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    /**
     * The same cases as resources/js/shared/money.test.ts: the narrow no-break space
     * (U+202F) separates thousands and a no-break space (U+00A0) precedes "DH".
     *
     * @return array<string, array{int, string}>
     */
    public static function amounts(): array
    {
        return [
            'whole dirhams without decimals' => [125000, "1\u{202F}250\u{00A0}DH"],
            'two decimals when centimes are present' => [125050, "1\u{202F}250,50\u{00A0}DH"],
            'below a thousand' => [45000, "450\u{00A0}DH"],
            'zero' => [0, "0\u{00A0}DH"],
        ];
    }

    #[DataProvider('amounts')]
    public function test_formats_centimes_the_way_the_storefront_displays_them(int $centimes, string $expected): void
    {
        $this->assertSame($expected, Money::format($centimes));
    }
}
