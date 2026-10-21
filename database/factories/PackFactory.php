<?php

namespace Database\Factories;

use App\Enums\PackEligibility;
use App\Enums\PackPricing;
use App\Enums\PackType;
use App\Models\Collection;
use App\Models\Pack;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Pack>
 */
class PackFactory extends Factory
{
    /**
     * Define the model's default state: an active custom pack of three perfumes chosen
     * from the whole published catalog, sold at a fixed 1 200 DH.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = 'Coffret '.Str::title(fake()->unique()->words(2, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'type' => PackType::Custom,
            'tagline' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'image_path' => null,
            'selection_count' => 3,
            'allowed_sizes' => null,
            'eligibility' => PackEligibility::All,
            'allow_duplicates' => false,
            'pricing_type' => PackPricing::Fixed,
            'price' => 120000,
            'discount_value' => null,
            'is_active' => true,
            'sort_order' => 0,
            'is_demo' => false,
        ];
    }

    /**
     * A pack with a given display name (the slug follows the name).
     */
    public function named(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $name,
            'slug' => Str::slug($name),
        ]);
    }

    /**
     * The customer composes the pack from eligible variants.
     */
    public function custom(int $selectionCount = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => PackType::Custom,
            'selection_count' => $selectionCount,
        ]);
    }

    /**
     * Contents defined by the store; add them with containing().
     */
    public function fixed(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => PackType::Fixed,
            'selection_count' => null,
            'allowed_sizes' => null,
            'eligibility' => PackEligibility::All,
            'allow_duplicates' => false,
        ]);
    }

    /**
     * The pack costs this price (centimes), whatever the selection.
     */
    public function fixedPrice(int $price): static
    {
        return $this->state(fn (array $attributes) => [
            'pricing_type' => PackPricing::Fixed,
            'price' => $price,
            'discount_value' => null,
        ]);
    }

    /**
     * This percentage off the sum of the selected variants.
     */
    public function percentOff(int $percent): static
    {
        return $this->state(fn (array $attributes) => [
            'pricing_type' => PackPricing::Percent,
            'price' => null,
            'discount_value' => $percent,
        ]);
    }

    /**
     * This amount (centimes) off the sum of the selected variants.
     */
    public function amountOff(int $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'pricing_type' => PackPricing::Amount,
            'price' => null,
            'discount_value' => $amount,
        ]);
    }

    /**
     * No longer offered on the storefront.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * The same perfume may fill several slots.
     */
    public function allowingDuplicates(): static
    {
        return $this->state(fn (array $attributes) => [
            'allow_duplicates' => true,
        ]);
    }

    /**
     * Only variants of these sizes (ml) can be chosen.
     *
     * @param  list<int>  $sizes
     */
    public function allowedSizes(array $sizes): static
    {
        return $this->state(fn (array $attributes) => [
            'allowed_sizes' => $sizes,
        ]);
    }

    /**
     * Only products of these collections can be chosen.
     */
    public function forCollections(Collection ...$collections): static
    {
        return $this->state(fn (array $attributes) => [
            'eligibility' => PackEligibility::Collections,
        ])->afterCreating(function (Pack $pack) use ($collections) {
            $pack->eligibleCollections()->attach(array_map(fn (Collection $c) => $c->id, $collections));
        });
    }

    /**
     * Only these products can be chosen.
     */
    public function forProducts(Product ...$products): static
    {
        return $this->state(fn (array $attributes) => [
            'eligibility' => PackEligibility::Products,
        ])->afterCreating(function (Pack $pack) use ($products) {
            $pack->eligibleProducts()->attach(array_map(fn (Product $p) => $p->id, $products));
        });
    }

    /**
     * Add bottles of a variant to a fixed pack; chain for several variants.
     */
    public function containing(ProductVariant $variant, int $quantity = 1): static
    {
        return $this->afterCreating(function (Pack $pack) use ($variant, $quantity) {
            $pack->items()->create([
                'product_variant_id' => $variant->id,
                'quantity' => $quantity,
                'sort_order' => $pack->items()->count(),
            ]);
        });
    }
}
