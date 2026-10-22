<?php

namespace Tests\Unit\Support;

use App\Support\MoroccanPhone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;

class MoroccanPhoneTest extends TestCase
{
    /**
     * @return array<string, array{string, string}>
     */
    public static function acceptedNumbers(): array
    {
        return [
            'national mobile' => ['0612345678', '+212612345678'],
            'national with spaces' => ['06 12 34 56 78', '+212612345678'],
            'national with dashes' => ['06-12-34-56-78', '+212612345678'],
            'national with dots' => ['06.12.34.56.78', '+212612345678'],
            'parentheses and padding' => ['  (0612) 34 56 78 ', '+212612345678'],
            'international plus' => ['+212612345678', '+212612345678'],
            'international with spaces' => ['+212 6 12 34 56 78', '+212612345678'],
            'international 00 prefix' => ['00212612345678', '+212612345678'],
            'country code without plus' => ['212612345678', '+212612345678'],
            'mobile starting with 7' => ['07 01 02 03 04', '+212701020304'],
            'fixed line starting with 5' => ['05 22 12 34 56', '+212522123456'],
        ];
    }

    #[DataProvider('acceptedNumbers')]
    public function test_normalize_returns_e164_for_moroccan_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, MoroccanPhone::normalize($input));
    }

    /**
     * @return array<string, array{?string}>
     */
    public static function rejectedNumbers(): array
    {
        return [
            'null' => [null],
            'empty' => [''],
            'unknown prefix 8' => ['0812345678'],
            'unknown prefix 4' => ['0412345678'],
            'one digit short' => ['061234567'],
            'one digit too many' => ['06123456789'],
            'french number' => ['+33612345678'],
            'trunk zero after country code' => ['+2120612345678'],
            'letters' => ['06 12 34 56 7a'],
            'words' => ['appelez-moi'],
            'slashes are not separators' => ['06/12/34/56/78'],
        ];
    }

    #[DataProvider('rejectedNumbers')]
    public function test_normalize_returns_null_for_anything_else(?string $input): void
    {
        $this->assertNull(MoroccanPhone::normalize($input));
    }

    #[TestWith(['06 12 34 56 78', true])]
    #[TestWith(['0812345678', false])]
    #[TestWith([null, false])]
    public function test_is_valid_reports_whether_the_number_can_be_normalized(?string $input, bool $expected): void
    {
        $this->assertSame($expected, MoroccanPhone::isValid($input));
    }

    #[TestWith(['+212612345678', '06 12 34 56 78'])]
    #[TestWith(['+212522123456', '05 22 12 34 56'])]
    public function test_format_renders_e164_in_national_pairs(string $e164, string $expected): void
    {
        $this->assertSame($expected, MoroccanPhone::format($e164));
    }
}
