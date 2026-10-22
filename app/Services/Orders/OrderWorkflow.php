<?php

namespace App\Services\Orders;

use App\Enums\InventoryReason;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderStatusChanged;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Inventory\InventoryManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place where an existing order changes. Each change is validated against
 * the allowed transitions and recorded as an OrderEvent.
 */
final class OrderWorkflow
{
    public function __construct(private readonly InventoryManager $inventory) {}

    public function transition(Order $order, OrderStatus $to, User $actor, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $to, $actor, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if (! $from->canTransitionTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "Impossible de passer une commande « {$from->label()} » à « {$to->label()} ».",
                ]);
            }

            $changes = ['status' => $to];

            if ($to === OrderStatus::Cancelled) {
                $this->restock($locked, $actor);
                $changes['cancelled_at'] = now();
            }

            if ($to === OrderStatus::Delivered) {
                $changes['delivered_at'] = now();
            }

            $locked->forceFill($changes)->save();

            $this->log($locked, 'status', $from->value, $to->value, $note, $actor);

            OrderStatusChanged::dispatch($locked, $from, $to);

            return $locked->fresh(['items.selections', 'events.user']);
        });
    }

    public function updatePayment(Order $order, PaymentStatus $to, User $actor, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $to, $actor, $note) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->payment_status;

            if (! in_array($to, $from->allowedTransitions(), true)) {
                throw ValidationException::withMessages([
                    'payment_status' => "Impossible de passer le paiement de « {$from->label()} » à « {$to->label()} ».",
                ]);
            }

            if ($to === PaymentStatus::Paid && $locked->status === OrderStatus::Cancelled) {
                throw ValidationException::withMessages(['payment_status' => 'Une commande annulée ne peut pas être marquée payée.']);
            }

            $locked->forceFill(['payment_status' => $to])->save();
            $this->log($locked, 'payment', $from->value, $to->value, $note, $actor);

            return $locked->fresh(['items.selections', 'events.user']);
        });
    }

    /**
     * @param  array{customer_name?: string, phone?: string, address?: string, delivery_notes?: ?string, carrier?: ?string, tracking_number?: ?string}  $data
     */
    public function updateDelivery(Order $order, array $data, User $actor): Order
    {
        $addressFields = ['customer_name', 'phone', 'address', 'delivery_notes'];
        $changesAddress = collect($data)
            ->only($addressFields)
            ->contains(fn (mixed $value, string $field) => (string) $value !== (string) $order->{$field});

        if ($changesAddress && in_array($order->status, [OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['address' => 'L’adresse ne peut plus être modifiée une fois la commande expédiée.']);
        }

        $before = $order->only(array_keys($data));
        $order->forceFill($data)->save();

        $changed = array_keys(array_diff_assoc(array_map('strval', $order->only(array_keys($data))), array_map('strval', $before)));

        if ($changed !== []) {
            $this->log($order, 'delivery', null, null, 'Champs modifiés : '.implode(', ', $changed), $actor);
        }

        return $order->fresh(['items.selections', 'events.user']);
    }

    public function addNote(Order $order, string $note, User $actor): OrderEvent
    {
        return $this->log($order, 'note', null, null, $note, $actor);
    }

    private function restock(Order $order, User $actor): void
    {
        $order->load('items.selections');

        $units = [];
        $byProduct = [];

        foreach ($order->items as $item) {
            $variantIds = $item->selections->isNotEmpty()
                ? $item->selections->pluck('product_variant_id')->all()
                : [$item->product_variant_id];

            foreach ($variantIds as $index => $variantId) {
                $productId = $item->selections->isNotEmpty() ? $item->selections[$index]->product_id : $item->product_id;

                if ($productId !== null) {
                    $byProduct[$productId] = ($byProduct[$productId] ?? 0) + $item->quantity;
                }
                if ($variantId !== null) {
                    $units[$variantId] = ($units[$variantId] ?? 0) + $item->quantity;
                }
            }
        }

        ksort($units);

        $variants = ProductVariant::query()->whereIn('id', array_keys($units))->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($units as $variantId => $quantity) {
            // Variants deleted since the sale cannot be restocked; the snapshot remains.
            if ($variant = $variants->get($variantId)) {
                $this->inventory->change($variant, $quantity, InventoryReason::Cancellation, $order, $actor);
            }
        }

        foreach ($byProduct as $productId => $quantity) {
            $units = (int) $quantity;
            Product::withTrashed()->whereKey($productId)->update([
                'sales_count' => DB::raw("CASE WHEN sales_count > {$units} THEN sales_count - {$units} ELSE 0 END"),
            ]);
        }
    }

    private function log(Order $order, string $type, ?string $from, ?string $to, ?string $note, ?User $actor): OrderEvent
    {
        return OrderEvent::create([
            'order_id' => $order->id,
            'type' => $type,
            'from' => $from,
            'to' => $to,
            'note' => $note,
            'user_id' => $actor?->id,
        ]);
    }
}
