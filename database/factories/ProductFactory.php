<?php

namespace Database\Factories;

use App\Enums\ProductStatus;
use App\Models\FragranceFamily;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state: an active product, visible as soon as it has
     * an active variant. Use the named states to make the publication state explicit.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(2, true));

        return [
            'fragrance_family_id' => FragranceFamily::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
            'tagline' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'inspiration' => null,
            'concentration' => 'Eau de parfum',
            'gender' => 'mixte',
            'longevity' => 4,
            'sillage' => 3,
            'status' => ProductStatus::Active,
            'is_featured' => false,
            'badge' => null,
            'accent_color' => null,
            'sales_count' => 0,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'is_demo' => false,
            'published_at' => null,
        ];
    }

    /**
     * A product with a given display name (the slug follows the name).
     */
    public function named(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
            'slug' => Str::slug($name),
        ]);
    }

    /**
     * Active and published in the past: visible on the storefront.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProductStatus::Active,
            'published_at' => now()->subDay(),
        ]);
    }

    /**
     * Active but with a publication date in the future: not visible yet.
     */
    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProductStatus::Active,
            'published_at' => now()->addWeek(),
        ]);
    }

    /**
     * Still being written: never visible on the storefront.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProductStatus::Draft,
        ]);
    }

    /**
     * Withdrawn from sale (status archived, not soft-deleted).
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProductStatus::Archived,
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
        ]);
    }

    /**
     * Part of the demonstration catalog shipped with the store.
     */
    public function demo(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_demo' => true,
        ]);
    }

    public function withoutFamily(): static
    {
        return $this->state(fn (array $attributes) => [
            'fragrance_family_id' => null,
        ]);
    }

    /**
     * Give the product one variant; call several times for several sizes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function withVariant(array $attributes = []): static
    {
        return $this->has(ProductVariant::factory()->state($attributes), 'variants');
    }
}
