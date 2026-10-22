<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Notifications\NewOrderAlert;
use App\Notifications\OrderConfirmation;
use App\Services\Settings\StoreSettings;
use App\Support\Locale;
use Illuminate\Support\Facades\Notification;

/**
 * Alerts the store that an order arrived, and confirms it to the customer when they left
 * an e-mail address, in the language they ordered in. Both notifications are queued:
 * checkout never waits on the mailer.
 */
class SendOrderPlacedNotifications
{
    public function __construct(private readonly StoreSettings $settings) {}

    public function handle(OrderPlaced $event): void
    {
        $order = $event->order;
        $contactEmail = $this->settings->get('contact.email');
        $storeEmail = $this->settings->get('notifications.orders_email') ?: $contactEmail;

        if ($storeEmail) {
            // The store reads French, whatever language the customer ordered in.
            Notification::route('mail', $storeEmail)->notify((new NewOrderAlert($order))->locale(Locale::FRENCH));
        }

        if ($order->email) {
            Notification::route('mail', [$order->email => $order->customer_name])
                ->notify((new OrderConfirmation($order, replyToAddress: $contactEmail))->locale($order->locale));
        }
    }
}
