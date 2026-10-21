<?php

namespace App\Services\Checkout;

use App\Enums\CartItemType;
use App\Enums\InventoryReason;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\User;
use App\Services\Cart\CartCalculator;
use App\Services\Cart\CartLine;
use App\Services\Inventory\InventoryManager;
use App\Services\Settings\StoreSettings;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Turns a cart into an order. Everything is recomputed under row locks inside one
 * transaction, so concurrent checkouts cannot oversell or reuse a spent coupon.
 */
final class OrderPlacer
{
    public function __construct(
        private readonly CartCalculator $calculator,
        private readonly InventoryManager $inventory,
        private readonly StoreSettings $settings,
    ) {}

    /**
     * @throws ValidationException
     */
    public function place(Cart $cart, CheckoutData $data, ?User $user, ?string $idempotencyKey): Order
    {
        if ($idempotencyKey !== null && ($existing = $this->findReplay($idempotencyKey, $cart))) {
            return $existing;
        }

        $this->guardPaymentMethod($data->paymentMethod);

        try {
            return DB::transaction(fn () => $this->placeLocked($cart, $data, $user, $idempotencyKey), attempts: 3);
        } catch (UniqueConstraintViolationException $e) {
            // A concurrent request with the same idempotency key won the race.
            if ($idempotencyKey !== null && ($existing = $this->findReplay($idempotencyKey, $cart))) {
                return $existing;
            }

            throw $e;
        }
    }

    private function placeLocked(Cart $cart, CheckoutData $data, ?User $user, ?string $idempotencyKey): Order
    {
        $lockedCart = Cart::query()->whereKey($cart->id)->lockForUpdate()->first();

        if ($lockedCart === null || $lockedCart->converted_at !== null) {
            throw ValidationException::withMessages(['cart' => 'Ce panier a déjà été commandé.']);
        }

        $summary = $this->calculator->summarize($lockedCart, $data->city, lock: true);

        if ($summary->isEmpty() || $summary->hasLineIssues() || $summary->deliveryError !== null || $summary->total() === null) {
            throw ValidationException::withMessages(['cart' => $summary->blockingMessages() ?: ['Votre panier ne peut pas être commandé.']]);
        }

        if ($summary->couponError !== null) {
            throw ValidationException::withMessages(['coupon' => $summary->couponError]);
        }

        $order = Order::create([
            'reference' => Order::generateReference(),
            'user_id' => $user?->id,
            'cart_id' => $lockedCart->id,
            'status' => OrderStatus::Pending,
            'payment_method' => $data->paymentMethod,
            'payment_status' => PaymentStatus::Unpaid,
            'customer_name' => $data->customerName,
            'phone' => $data->phone,
            'email' => $data->email,
            'city_id' => $data->city->id,
            'city_name' => $data->city->name,
            'address' => $data->address,
            'delivery_notes' => $data->deliveryNotes,
            'delivery_zone_name' => $data->city->zone?->name,
            'subtotal' => $summary->subtotal,
            'discount_total' => $summary->discount,
            'coupon_id' => $summary->coupon?->id,
            'coupon_code' => $summary->coupon?->code,
            'delivery_fee' => $summary->deliveryFee,
            'total' => $summary->total(),
            'items_count' => $summary->itemsCount(),
            'idempotency_key' => $idempotencyKey,
            'guest_token' => Order::generateGuestToken(),
            'placed_at' => now(),
        ]);

        $unitsByProduct = [];

        foreach ($summary->lines as $line) {
            $this->writeLine($order, $line);

            foreach ($line->variants as $variant) {
                $unitsByProduct[$variant->product_id] = ($unitsByProduct[$variant->product_id] ?? 0) + $line->quantity();
            }
        }

        $this->decrementStock($order, $summary->lines);

        foreach ($unitsByProduct as $productId => $units) {
            Product::query()->whereKey($productId)->increment('sales_count', $units);
        }

        if ($summary->coupon !== null && $summary->discount > 0) {
            $summary->coupon->increment('used_count');
        }

        $lockedCart->forceFill(['converted_at' => now()])->save();

        OrderEvent::create([
            'order_id' => $order->id,
            'type' => 'status',
            'from' => null,
            'to' => OrderStatus::Pending->value,
            'note' => 'Commande passée en ligne.',
            'user_id' => $user?->id,
        ]);

        return $order->load('items.selections');
    }

    private function writeLine(Order $order, CartLine $line): void
    {
        $item = $line->item;

        if ($item->type === CartItemType::Product) {
            $variant = $line->variants[0];

            $order->items()->create([
                'type' => CartItemType::Product,
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'name' => $variant->product->name,
                'variant_label' => $variant->label(),
                'sku' => $variant->sku,
                'unit_price' => $line->unitPrice,
                'compare_at_price' => $line->compareAtPrice,
                'quantity' => $line->quantity(),
                'line_total' => $line->lineTotal(),
            ]);

            return;
        }

        $pack = $item->pack;

        $orderItem = $order->items()->create([
            'type' => CartItemType::Pack,
            'pack_id' => $pack->id,
            'name' => $pack->name,
            'variant_label' => count($line->variants).' parfums',
            'unit_price' => $line->unitPrice,
            'compare_at_price' => $line->compareAtPrice,
            'quantity' => $line->quantity(),
            'line_total' => $line->lineTotal(),
            'meta' => [
                'pack_type' => $pack->type->value,
                'pricing_type' => $pack->pricing_type->value,
                'pack_price' => $pack->price,
                'discount_value' => $pack->discount_value,
            ],
        ]);

        foreach ($line->variants as $position => $variant) {
            $orderItem->selections()->create([
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'product_name' => $variant->product->name,
                'size_ml' => $variant->size_ml,
                'sku' => $variant->sku,
                'unit_price' => $variant->price,
                'position' => $position + 1,
            ]);
        }
    }

    /**
     * @param  list<CartLine>  $lines
     */
    private function decrementStock(Order $order, array $lines): void
    {
        $demand = [];
        $variants = [];

        foreach ($lines as $line) {
            foreach ($line->demand() as $variantId => $units) {
                $demand[$variantId] = ($demand[$variantId] ?? 0) + $units;
            }
            foreach ($line->variants as $variant) {
                $variants[$variant->id] = $variant;
            }
        }

        ksort($demand);

        foreach ($demand as $variantId => $units) {
            $this->inventory->change($variants[$variantId], -$units, InventoryReason::Sale, $order);
        }
    }

    private function guardPaymentMethod(PaymentMethod $method): void
    {
        $enabled = match ($method) {
            PaymentMethod::CashOnDelivery => $this->settings->bool('payment.cod_enabled'),
        };

        if (! $enabled) {
            throw ValidationException::withMessages(['payment_method' => 'Ce mode de paiement n’est pas disponible.']);
        }
    }

    private function findReplay(string $idempotencyKey, Cart $cart): ?Order
    {
        $order = Order::query()->where('idempotency_key', $idempotencyKey)->first();

        if ($order === null) {
            return null;
        }

        // A key can only replay the order of the cart it was created with.
        if ($order->cart_id !== $cart->id) {
            throw ValidationException::withMessages(['idempotency_key' => 'Requête invalide. Veuillez recharger la page.']);
        }

        return $order->load('items.selections');
    }
}
