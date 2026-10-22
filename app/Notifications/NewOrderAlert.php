<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Tells the store's inbox that an order arrived, with everything needed to prepare it. */
class NewOrderAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('items.selections');

        return (new MailMessage)
            ->subject("Nouvelle commande {$order->reference} — ".Money::format($order->total))
            ->markdown('mail.orders.new-order-alert', [
                'order' => $order,
                'url' => url('/admin/commandes/'.$order->reference),
            ]);
    }
}
