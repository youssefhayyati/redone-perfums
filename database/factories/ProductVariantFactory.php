<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state: a 50 ml bottle at 450 DH with comfortable stock.
     * `stock` is not fillable on the model; factories run unguarded, so it can be set here.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'size_ml' => 50,
            'sku' => fake()->unique()->bothify('RP-####-??##'),
            'price' => 45000,
            'compare_at_price' => null,
            'stock' => 20,
            'low_stock_threshold' => 5,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Nothing left to sell.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
        ]);
    }

    /**
     * Above zero but at or below the alert threshold.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 2,
            'low_stock_threshold' => 5,
        ]);
    }

    /**
     * Switched off by the store: not sellable even if the product is published.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Shown with a struck-through former price.
     */
    public function discounted(int $compareAtPrice): static
    {
        return $this->state(fn (array $attributes) => [
            'compare_at_price' => $compareAtPrice,
        ]);
    }
}
