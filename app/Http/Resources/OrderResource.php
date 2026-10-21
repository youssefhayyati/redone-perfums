<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Support\MoroccanPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Customer-facing order view (confirmation page and account history).
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'payment_method' => $this->payment_method->value,
            'payment_method_label' => $this->payment_method->label(),
            'payment_status' => $this->payment_status->value,
            'customer_name' => $this->customer_name,
            'phone' => MoroccanPhone::format($this->phone),
            'email' => $this->email,
            'city' => $this->city_name,
            'address' => $this->address,
            'delivery_notes' => $this->delivery_notes,
            'tracking_number' => $this->tracking_number,
            'carrier' => $this->carrier,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'coupon_code' => $this->coupon_code,
            'delivery_fee' => $this->delivery_fee,
            'total' => $this->total,
            'items_count' => $this->items_count,
            'placed_at' => $this->placed_at->toIso8601String(),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'type' => $item->type->value,
                'name' => $item->name,
                'variant_label' => $item->variant_label,
                'unit_price' => $item->unit_price,
                'compare_at_price' => $item->compare_at_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
                'selections' => $item->selections->map(fn ($s) => [
                    'product_name' => $s->product_name,
                    'size_ml' => $s->size_ml,
                    'unit_price' => $s->unit_price,
                ])->values(),
            ])->values()),
        ];
    }
}
