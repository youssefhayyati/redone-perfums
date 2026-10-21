<?php

namespace App\Services\Cart;

use App\Enums\CartItemType;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\City;
use App\Models\Coupon;
use App\Models\ProductVariant;
use App\Services\Packs\PackResolver;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Prices a cart from the database. Nothing the client sends is trusted: prices,
 * pack prices, coupon reductions, delivery fees and stock are all read here.
 */
final class CartCalculator
{
    public function __construct(private readonly PackResolver $packs) {}

    /**
     * @param  bool  $lock  lock variant (and coupon) rows; only meaningful inside a transaction
     */
    public function summarize(Cart $cart, ?City $city = null, bool $lock = false): CartSummary
    {
        $cart->loadMissing(['items.pack.items', 'coupon']);

        $variants = $this->loadVariants($cart->items, $lock);

        $lines = $cart->items->map(fn (CartItem $item) => $this->line($item, $variants))->all();

        $this->flagStockShortages($lines, $variants);

        $subtotal = array_sum(array_map(fn (CartLine $l) => $l->lineTotal(), $lines));

        [$coupon, $couponError, $discount] = $this->applyCoupon($cart, $subtotal, $lock);

        [$deliveryFee, $deliveryError] = $this->delivery($city, max(0, $subtotal - $discount));

        return new CartSummary(
            cart: $cart,
            lines: array_values($lines),
            subtotal: $subtotal,
            coupon: $coupon,
            couponError: $couponError,
            discount: $discount,
            city: $city,
            deliveryFee: $deliveryFee,
            deliveryError: $deliveryError,
        );
    }

    /**
     * @param  Collection<int, CartItem>  $items
     * @return Collection<int, ProductVariant>
     */
    private function loadVariants(Collection $items, bool $lock): Collection
    {
        $ids = [];
        foreach ($items as $item) {
            if ($item->type === CartItemType::Product) {
                $ids[] = $item->product_variant_id;
            } elseif ($item->pack !== null) {
                $ids = [...$ids, ...($item->pack->isCustom()
                    ? array_map('intval', $item->selections ?? [])
                    : $item->pack->items->pluck('product_variant_id')->all())];
            }
        }

        $ids = array_values(array_unique(array_filter($ids)));
        if ($ids === []) {
            return collect();
        }

        $query = ProductVariant::query()
            ->whereIn('id', $ids)
            ->with(['product' => fn ($q) => $q->with(['images', 'family'])]);

        if ($lock) {
            $query->orderBy('id')->lockForUpdate();
        }

        return $query->get()->keyBy('id');
    }

    /**
     * @param  Collection<int, ProductVariant>  $variants
     */
    private function line(CartItem $item, Collection $variants): CartLine
    {
        if ($item->type === CartItemType::Product) {
            $variant = $variants->get($item->product_variant_id);

            if ($variant === null || ! $variant->isSellable()) {
                // Keep the already-loaded variant for display instead of lazy loading it later.
                $item->setRelation('variant', $variant);

                return CartLine::unavailable($item, 'Un article de votre panier n’est plus disponible.');
            }

            return new CartLine($item, $variant->price, $variant->compare_at_price, [$variant]);
        }

        $pack = $item->pack;
        if ($pack === null || ! $pack->is_active) {
            return CartLine::unavailable($item, 'Un coffret de votre panier n’est plus proposé.');
        }

        try {
            $resolved = $this->packs->resolveSelection($pack, $item->selections ?? []);
        } catch (ValidationException $e) {
            return CartLine::unavailable($item, 'Coffret « '.$pack->name.' » : '.collect($e->errors())->flatten()->first());
        }

        // Price from the (possibly locked) rows loaded for this calculation.
        $selection = [];
        foreach ($resolved as $variant) {
            $fresh = $variants->get($variant->id);
            if ($fresh === null || ! $fresh->isSellable()) {
                return CartLine::unavailable($item, 'Coffret « '.$pack->name.' » : un des parfums n’est plus disponible.');
            }
            $selection[] = $fresh;
        }

        $quote = $this->packs->quote($pack, $selection);

        return new CartLine($item, $quote->price, $quote->compareAt > $quote->price ? $quote->compareAt : null, $selection);
    }

    /**
     * @param  list<CartLine>  $lines
     * @param  Collection<int, ProductVariant>  $variants
     */
    private function flagStockShortages(array $lines, Collection $variants): void
    {
        $demand = [];
        foreach ($lines as $line) {
            if (! $line->isPriced()) {
                continue;
            }
            foreach ($line->demand() as $variantId => $units) {
                $demand[$variantId] = ($demand[$variantId] ?? 0) + $units;
            }
        }

        foreach ($demand as $variantId => $units) {
            $variant = $variants->get($variantId);
            if ($variant === null || $units <= $variant->stock) {
                continue;
            }

            $available = max(0, $variant->stock);
            $message = $available === 0
                ? "{$variant->product->name} {$variant->label()} est en rupture de stock."
                : "{$variant->product->name} {$variant->label()} : il n’en reste que {$available}.";

            foreach ($lines as $line) {
                if (isset($line->demand()[$variantId]) && ! $line->hasIssue('insufficient_stock')) {
                    $line->addIssue('insufficient_stock', $message);
                }
            }
        }
    }

    /**
     * @return array{0: ?Coupon, 1: ?string, 2: int}
     */
    private function applyCoupon(Cart $cart, int $subtotal, bool $lock): array
    {
        if ($cart->coupon_id === null) {
            return [null, null, 0];
        }

        $coupon = $lock
            ? Coupon::query()->whereKey($cart->coupon_id)->lockForUpdate()->first()
            : $cart->coupon;

        if ($coupon === null) {
            return [null, null, 0];
        }

        if ($reason = $coupon->rejectionReason($subtotal)) {
            return [$coupon, $reason, 0];
        }

        return [$coupon, null, $coupon->discountFor($subtotal)];
    }

    /**
     * @return array{0: ?int, 1: ?string}
     */
    private function delivery(?City $city, int $merchandiseTotal): array
    {
        if ($city === null) {
            return [null, null];
        }

        $city->loadMissing('zone');

        if (! $city->is_active || $city->zone === null || ! $city->zone->is_active) {
            return [null, 'La livraison n’est pas disponible pour cette ville.'];
        }

        return [$city->zone->feeFor($merchandiseTotal), null];
    }
}
