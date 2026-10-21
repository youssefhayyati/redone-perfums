<?php

namespace App\Http\Resources;

use App\Enums\CartItemType;
use App\Models\ProductVariant;
use App\Services\Cart\CartLine;
use App\Services\Cart\CartManager;
use App\Services\Cart\CartSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property CartSummary $resource
 */
class CartResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $summary = $this->resource;
        $zone = $summary->city?->zone;

        return [
            'token' => $summary->cart->token,
            'lines' => array_map(fn (CartLine $line) => $this->line($line), $summary->lines),
            'items_count' => $summary->itemsCount(),
            'subtotal' => $summary->subtotal,
            'coupon' => $summary->coupon ? [
                'code' => $summary->coupon->code,
                'discount' => $summary->discount,
                'error' => $summary->couponError,
            ] : null,
            'discount_total' => $summary->discount,
            'delivery' => $summary->city ? [
                'city_id' => $summary->city->id,
                'city' => $summary->city->name,
                'fee' => $summary->deliveryFee,
                'free_shipping_threshold' => $zone?->free_shipping_threshold,
                'remaining_for_free_shipping' => $zone?->free_shipping_threshold !== null && $summary->deliveryFee > 0
                    ? max(0, $zone->free_shipping_threshold - $summary->merchandiseTotal())
                    : null,
                'estimate' => $zone?->delivery_estimate,
                'error' => $summary->deliveryError,
            ] : null,
            'total' => $summary->total(),
            'merchandise_total' => $summary->merchandiseTotal(),
            'is_checkout_ready' => ! $summary->isEmpty() && ! $summary->hasLineIssues() && $summary->couponError === null,
            'max_quantity' => CartManager::MAX_QUANTITY,
        ];
    }

    private function line(CartLine $line): array
    {
        $item = $line->item;

        $base = [
            'id' => $item->id,
            'type' => $item->type->value,
            'quantity' => $item->quantity,
            'unit_price' => $line->isPriced() ? $line->unitPrice : null,
            'compare_at_price' => $line->compareAtPrice,
            'line_total' => $line->lineTotal(),
            'issues' => $line->issues,
        ];

        if ($item->type === CartItemType::Product) {
            $variant = $line->variants[0] ?? $item->variant;
            $product = $variant?->product;

            return [...$base,
                'product' => $product ? [
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'family' => $product->family?->name,
                    'image' => $product->images->first()?->toPublicArray(),
                ] : null,
                'variant' => $variant ? ['id' => $variant->id, 'size_ml' => $variant->size_ml, 'label' => $variant->label()] : null,
            ];
        }

        $pack = $item->pack;

        return [...$base,
            'pack' => $pack ? [
                'id' => $pack->id,
                'slug' => $pack->slug,
                'name' => $pack->name,
                'type' => $pack->type->value,
                'image' => $pack->imageUrl(),
                'editable' => $pack->isCustom(),
            ] : null,
            'selections' => array_map(fn (ProductVariant $v) => [
                'variant_id' => $v->id,
                'product_name' => $v->product->name,
                'product_slug' => $v->product->slug,
                'size_ml' => $v->size_ml,
                'unit_price' => $v->price,
                'image' => $v->product->images->first()?->toPublicArray(),
            ], $line->variants),
            'raw_selections' => $item->selections,
        ];
    }
}
