<?php

namespace Tests\Unit\Enums;

use App\Enums\PaymentStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PaymentStatusTest extends TestCase
{
    /**
     * @return array<string, array{PaymentStatus, list<PaymentStatus>}>
     */
    public static function transitions(): array
    {
        return [
            'unpaid can only be paid' => [PaymentStatus::Unpaid, [PaymentStatus::Paid]],
            'paid can be refunded or reverted to unpaid' => [PaymentStatus::Paid, [PaymentStatus::Refunded, PaymentStatus::Unpaid]],
            'refunded is final' => [PaymentStatus::Refunded, []],
        ];
    }

    /**
     * @param  list<PaymentStatus>  $expected
     */
    #[DataProvider('transitions')]
    public function test_allowed_transitions_follow_the_payment_workflow(PaymentStatus $from, array $expected): void
    {
        $this->assertSame($expected, $from->allowedTransitions());
    }
}
