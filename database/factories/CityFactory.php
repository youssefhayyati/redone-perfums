<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\DeliveryZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    /**
     * Define the model's default state: an active city in its own active zone.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'delivery_zone_id' => DeliveryZone::factory(),
            'name' => fake()->unique()->city(),
            'region' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function named(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
        ]);
    }

    /**
     * Switched off by the store.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Not attached to any delivery zone (e.g. after its zone was deleted).
     */
    public function withoutZone(): static
    {
        return $this->state(fn (array $attributes) => [
            'delivery_zone_id' => null,
        ]);
    }
}
