<?php

namespace Tests\Unit\Enums;

use App\Enums\OrderStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class OrderStatusTest extends TestCase
{
    /**
     * The order workflow as the back office must enforce it.
     */
    private const ALLOWED = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    /**
     * @return array<string, array{OrderStatus, OrderStatus, bool}>
     */
    public static function transitions(): array
    {
        $cases = [];

        foreach (OrderStatus::cases() as $from) {
            foreach (OrderStatus::cases() as $to) {
                $cases["{$from->value} to {$to->value}"] = [$from, $to, in_array($to->value, self::ALLOWED[$from->value], true)];
            }
        }

        return $cases;
    }

    #[DataProvider('transitions')]
    public function test_can_transition_to_follows_the_order_workflow(OrderStatus $from, OrderStatus $to, bool $allowed): void
    {
        $this->assertSame($allowed, $from->canTransitionTo($to));
    }

    /**
     * @return array<string, array{OrderStatus, bool}>
     */
    public static function finality(): array
    {
        return [
            'pending' => [OrderStatus::Pending, false],
            'confirmed' => [OrderStatus::Confirmed, false],
            'processing' => [OrderStatus::Processing, false],
            'shipped' => [OrderStatus::Shipped, false],
            'delivered' => [OrderStatus::Delivered, true],
            'cancelled' => [OrderStatus::Cancelled, true],
        ];
    }

    #[DataProvider('finality')]
    public function test_only_delivered_and_cancelled_orders_are_final(OrderStatus $status, bool $final): void
    {
        $this->assertSame($final, $status->isFinal());
    }

    /**
     * @return array<string, array{OrderStatus, bool}>
     */
    public static function salesStatuses(): array
    {
        return [
            'pending' => [OrderStatus::Pending, true],
            'confirmed' => [OrderStatus::Confirmed, true],
            'processing' => [OrderStatus::Processing, true],
            'shipped' => [OrderStatus::Shipped, true],
            'delivered' => [OrderStatus::Delivered, true],
            'cancelled' => [OrderStatus::Cancelled, false],
        ];
    }

    #[DataProvider('salesStatuses')]
    public function test_every_status_except_cancelled_counts_as_a_sale(OrderStatus $status, bool $countsAsSale): void
    {
        $this->assertSame($countsAsSale, $status->countsAsSale());
    }
}
