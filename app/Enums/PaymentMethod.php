<?php

namespace App\Enums;

enum PaymentMethod: string
{
    /**
     * Cash on delivery. This is the only method implemented: online card payment
     * needs a provider contract (e.g. CMI) and credentials — see docs/INTEGRATIONS.md.
     */
    case CashOnDelivery = 'cod';

    public function label(): string
    {
        return match ($this) {
            self::CashOnDelivery => 'Paiement à la livraison',
        };
    }
}
