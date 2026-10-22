<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductImage>
 */
class ProductImageFactory extends Factory
{
    /**
     * Define the model's default state: a processed WebP on the public disk, as
     * ImageProcessor stores it, without responsive variants.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'path' => 'products/'.Str::lower(Str::ulid()).'.webp',
            'variants' => null,
            'alt' => fake()->sentence(3),
            'width' => 1600,
            'height' => 2000,
            'sort_order' => 0,
        ];
    }

    /**
     * Main file plus the 480 and 960 px variants written by ImageProcessor.
     */
    public function withResponsiveVariants(): static
    {
        return $this->state(function (array $attributes) {
            $base = Str::beforeLast($attributes['path'], '.webp');

            return [
                'variants' => [
                    480 => $base.'-480.webp',
                    960 => $base.'-960.webp',
                    1600 => $attributes['path'],
                ],
            ];
        });
    }
}
