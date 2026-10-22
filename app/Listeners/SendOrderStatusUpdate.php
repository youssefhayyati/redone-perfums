<?php

namespace App\Listeners;

use App\Events\OrderStatusChanged;
use App\Notifications\OrderStatusUpdate;
use App\Services\Settings\StoreSettings;
use Illuminate\Support\Facades\Notification;

/**
 * Tells the customer, by e-mail when they left one and in the language they ordered in,
 * that their order was confirmed, shipped, delivered or cancelled. "In preparation" is
 * internal and sends nothing.
 */
class SendOrderStatusUpdate
{
    public function __construct(private readonly StoreSettings $settings) {}

    public function handle(OrderStatusChanged $event): void
    {
        $order = $event->order;

        if (! $order->email || ! in_array($event->to, OrderStatusUpdate::STATUSES, true)) {
            return;
        }

        Notification::route('mail', [$order->email => $order->customer_name])
            ->notify((new OrderStatusUpdate($order, $event->to, replyToAddress: $this->settings->get('contact.email')))->locale($order->locale));
    }
}
