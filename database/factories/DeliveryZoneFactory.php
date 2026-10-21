<?php

namespace Database\Factories;

use App\Models\DeliveryZone;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DeliveryZone>
 */
class DeliveryZoneFactory extends Factory
{
    /**
     * Define the model's default state: an active zone charging 30 DH, with no
     * free-shipping threshold.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Zone '.Str::title(fake()->unique()->word()),
            'fee' => 3000,
            'free_shipping_threshold' => null,
            'delivery_estimate' => '24 à 48 h',
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Delivery suspended for every city of the zone.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Delivery becomes free from this merchandise total (centimes).
     */
    public function freeShippingFrom(int $threshold): static
    {
        return $this->state(fn (array $attributes) => [
            'free_shipping_threshold' => $threshold,
        ]);
    }
}
