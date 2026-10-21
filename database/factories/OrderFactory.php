<?php

namespace Database\Factories;

use App\Enums\CartItemType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Read-only order fixtures (listings, searches, statistics). Orders whose placement or
 * workflow is under test should be placed through checkout or OrderPlacer instead.
 *
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state: a pending cash-on-delivery guest order of
     * 450 DH plus 30 DH delivery, placed now.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => strtoupper(fake()->unique()->bothify('RP-'.now()->format('ymd').'-??##??')),
            'user_id' => null,
            'cart_id' => null,
            'status' => OrderStatus::Pending,
            'payment_method' => PaymentMethod::CashOnDelivery,
            'payment_status' => PaymentStatus::Unpaid,
            'customer_name' => fake()->name(),
            'phone' => '+2126'.fake()->unique()->numerify('########'),
            'email' => fake()->unique()->safeEmail(),
            'city_id' => null,
            'city_name' => 'Casablanca',
            'address' => '12 rue des Orangers, Maârif',
            'delivery_notes' => null,
            'delivery_zone_name' => 'Grand Casablanca',
            'carrier' => null,
            'tracking_number' => null,
            'subtotal' => 45000,
            'discount_total' => 0,
            'coupon_id' => null,
            'coupon_code' => null,
            'delivery_fee' => 3000,
            'total' => 48000,
            'items_count' => 1,
            'idempotency_key' => null,
            'guest_token' => Str::random(48),
            'admin_notes' => null,
            'placed_at' => now(),
            'cancelled_at' => null,
            'delivered_at' => null,
        ];
    }

    /**
     * Merchandise subtotal, delivery fee and discount, with the matching total.
     */
    public function amounts(int $subtotal, int $deliveryFee = 3000, int $discount = 0): static
    {
        return $this->state(fn (array $attributes) => [
            'subtotal' => $subtotal,
            'delivery_fee' => $deliveryFee,
            'discount_total' => $discount,
            'total' => $subtotal - $discount + $deliveryFee,
        ]);
    }

    public function placedAt(mixed $date): static
    {
        return $this->state(fn (array $attributes) => [
            'placed_at' => $date,
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Confirmed,
        ]);
    }

    public function shipped(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Shipped,
        ]);
    }

    public function delivered(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Delivered,
            'delivered_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Cancelled,
            'cancelled_at' => now(),
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_status' => PaymentStatus::Paid,
        ]);
    }

    /**
     * Add a product line snapshot (name, label, SKU and price copied from the variant).
     */
    public function withItem(ProductVariant $variant, int $quantity = 1): static
    {
        return $this->afterCreating(function (Order $order) use ($variant, $quantity) {
            $variant->loadMissing('product');

            $order->items()->create([
                'type' => CartItemType::Product,
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'name' => $variant->product->name,
                'variant_label' => $variant->label(),
                'sku' => $variant->sku,
                'unit_price' => $variant->price,
                'compare_at_price' => $variant->compare_at_price,
                'quantity' => $quantity,
                'line_total' => $variant->price * $quantity,
            ]);
        });
    }
}
