<?php

namespace Database\Factories;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coupon>
 */
class CouponFactory extends Factory
{
    /**
     * Define the model's default state: an active, unlimited 10 % code.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('CODE-####??')),
            'description' => null,
            'type' => CouponType::Percent,
            'value' => 10,
            'min_subtotal' => null,
            'max_uses' => null,
            'used_count' => 0,
            'starts_at' => null,
            'ends_at' => null,
            'is_active' => true,
        ];
    }

    /**
     * This percentage off the merchandise subtotal.
     */
    public function percent(int $percent): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CouponType::Percent,
            'value' => $percent,
        ]);
    }

    /**
     * This amount (centimes) off the merchandise subtotal.
     */
    public function fixed(int $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CouponType::Fixed,
            'value' => $amount,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Its validity period has ended.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => now()->subMonth(),
            'ends_at' => now()->subDay(),
        ]);
    }

    /**
     * Its validity period has not started yet.
     */
    public function notYetValid(): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => now()->addDay(),
            'ends_at' => null,
        ]);
    }

    /**
     * Every allowed use has been consumed.
     */
    public function exhausted(): static
    {
        return $this->state(fn (array $attributes) => [
            'max_uses' => 5,
            'used_count' => 5,
        ]);
    }

    /**
     * Only applies from this merchandise subtotal (centimes).
     */
    public function minimumSubtotal(int $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'min_subtotal' => $amount,
        ]);
    }
}
