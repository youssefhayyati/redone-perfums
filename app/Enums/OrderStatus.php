<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Processing, self::Cancelled],
            self::Processing => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function isFinal(): bool
    {
        return $this->allowedTransitions() === [];
    }

    /** Orders that count towards revenue and sales statistics. */
    public function countsAsSale(): bool
    {
        return $this !== self::Cancelled;
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('En attente'),
            self::Confirmed => __('Confirmée'),
            self::Processing => __('En préparation'),
            self::Shipped => __('Expédiée'),
            self::Delivered => __('Livrée'),
            self::Cancelled => __('Annulée'),
        };
    }
}
