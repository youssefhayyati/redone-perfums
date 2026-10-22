<?php

namespace App\Http\Resources\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Support\MoroccanPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class AdminOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'payment_method' => $this->payment_method->value,
            'payment_method_label' => $this->payment_method->label(),
            'payment_status' => $this->payment_status->value,
            'payment_status_label' => $this->payment_status->label(),
            'customer_name' => $this->customer_name,
            'phone' => MoroccanPhone::format($this->phone),
            'phone_e164' => $this->phone,
            'email' => $this->email,
            'locale' => $this->locale,
            'city_id' => $this->city_id,
            'city' => $this->city_name,
            'delivery_zone' => $this->delivery_zone_name,
            'address' => $this->address,
            'delivery_notes' => $this->delivery_notes,
            'carrier' => $this->carrier,
            'tracking_number' => $this->tracking_number,
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'coupon_code' => $this->coupon_code,
            'delivery_fee' => $this->delivery_fee,
            'total' => $this->total,
            'items_count' => $this->items_count,
            'admin_notes' => $this->admin_notes,
            'placed_at' => $this->placed_at->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'customer' => $this->whenLoaded('user', fn () => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name, 'email' => $this->user->email] : null),
            'allowed_transitions' => array_map(fn (OrderStatus $s) => ['value' => $s->value, 'label' => $s->label()], $this->status->allowedTransitions()),
            'allowed_payment_transitions' => array_map(fn (PaymentStatus $s) => ['value' => $s->value, 'label' => $s->label()], $this->payment_status->allowedTransitions()),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'type' => $item->type->value,
                'name' => $item->name,
                'variant_label' => $item->variant_label,
                'sku' => $item->sku,
                'product_id' => $item->product_id,
                'pack_id' => $item->pack_id,
                'unit_price' => $item->unit_price,
                'compare_at_price' => $item->compare_at_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
                'meta' => $item->meta,
                'selections' => $item->selections->map(fn ($s) => [
                    'position' => $s->position,
                    'product_id' => $s->product_id,
                    'product_name' => $s->product_name,
                    'size_ml' => $s->size_ml,
                    'sku' => $s->sku,
                    'unit_price' => $s->unit_price,
                ])->values(),
            ])->values()),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'from' => $e->from,
                'to' => $e->to,
                'note' => $e->note,
                'user' => $e->user?->name,
                'created_at' => $e->created_at->toIso8601String(),
            ])->values()),
        ];
    }
}
