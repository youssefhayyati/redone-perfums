<?php

namespace App\Services\Checkout;

use App\Enums\PaymentMethod;
use App\Models\City;

final readonly class CheckoutData
{
    public function __construct(
        public string $customerName,
        public string $phone,
        public ?string $email,
        public City $city,
        public string $address,
        public ?string $deliveryNotes,
        public PaymentMethod $paymentMethod,
    ) {}
}
