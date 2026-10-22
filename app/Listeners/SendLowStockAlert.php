<?php

namespace App\Listeners;

use App\Enums\InventoryReason;
use App\Events\OrderPlaced;
use App\Models\InventoryMovement;
use App\Notifications\LowStockAlert;
use App\Services\Settings\StoreSettings;
use App\Support\Locale;
use Illuminate\Support\Facades\Notification;

/**
 * Warns the store when an order takes a format down to its low-stock threshold (or sells
 * it out). Only the order that crosses the threshold alerts, not every sale below it.
 */
class SendLowStockAlert
{
    public function __construct(private readonly StoreSettings $settings) {}

    public function handle(OrderPlaced $event): void
    {
        $storeEmail = $this->settings->get('notifications.orders_email') ?: $this->settings->get('contact.email');

        if (! $storeEmail) {
            return;
        }

        $variants = InventoryMovement::query()
            ->where('order_id', $event->order->id)
            ->where('reason', InventoryReason::Sale)
            ->with('variant.product')
            ->orderBy('id')
            ->get()
            ->groupBy('product_variant_id')
            ->filter(function ($movements) {
                $variant = $movements->first()->variant;
                $before = $movements->first()->stock_after - $movements->first()->change;
                $after = $movements->last()->stock_after;

                return $variant !== null && $after <= $variant->low_stock_threshold && $before > $variant->low_stock_threshold;
            })
            ->map(fn ($movements) => $movements->last()->variant->setAttribute('stock', $movements->last()->stock_after))
            ->values();

        if ($variants->isNotEmpty()) {
            Notification::route('mail', $storeEmail)->notify((new LowStockAlert($variants->all()))->locale(Locale::FRENCH));
        }
    }
}
