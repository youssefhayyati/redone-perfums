<?php

namespace App\Services\Cart;

use App\Models\Cart;
use App\Models\City;
use App\Models\Coupon;

final class CartSummary
{
    /**
     * @param  list<CartLine>  $lines
     */
    public function __construct(
        public readonly Cart $cart,
        public readonly array $lines,
        public readonly int $subtotal,
        public readonly ?Coupon $coupon,
        public readonly ?string $couponError,
        public readonly int $discount,
        public readonly ?City $city,
        public readonly ?int $deliveryFee,
        public readonly ?string $deliveryError,
    ) {}

    public function merchandiseTotal(): int
    {
        return max(0, $this->subtotal - $this->discount);
    }

    /** Total including delivery, or null until a deliverable city is known. */
    public function total(): ?int
    {
        return $this->deliveryFee === null ? null : $this->merchandiseTotal() + $this->deliveryFee;
    }

    /** Number of articles in the bag; a pack counts as one article. */
    public function itemsCount(): int
    {
        return array_sum(array_map(fn (CartLine $l) => $l->quantity(), $this->lines));
    }

    public function hasLineIssues(): bool
    {
        foreach ($this->lines as $line) {
            if ($line->issues !== []) {
                return true;
            }
        }

        return false;
    }

    public function isEmpty(): bool
    {
        return $this->lines === [];
    }

    /**
     * @return list<string>
     */
    public function blockingMessages(): array
    {
        $messages = [];

        if ($this->isEmpty()) {
            $messages[] = __('Votre panier est vide.');
        }

        foreach ($this->lines as $line) {
            foreach ($line->issues as $issue) {
                $messages[] = $issue['message'];
            }
        }

        if ($this->couponError !== null) {
            $messages[] = $this->couponError;
        }

        if ($this->deliveryError !== null) {
            $messages[] = $this->deliveryError;
        }

        return array_values(array_unique($messages));
    }
}
