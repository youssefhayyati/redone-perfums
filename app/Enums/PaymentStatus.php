<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Paid = 'paid';
    case Refunded = 'refunded';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Unpaid => [self::Paid],
            self::Paid => [self::Refunded, self::Unpaid],
            self::Refunded => [],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Unpaid => __('Non payée'),
            self::Paid => __('Payée'),
            self::Refunded => __('Remboursée'),
        };
    }
}
