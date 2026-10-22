<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Locale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Confirms an order to the customer, with a link to follow it. The link carries the
 * order's guest token, the same one checkout returns to the confirmation page.
 */
class OrderConfirmation extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  string|null  $replyToAddress  The store's contact address, so customers can simply reply.
     */
    public function __construct(public Order $order, public ?string $replyToAddress = null)
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

        $message = (new MailMessage)
            ->subject(__('Votre commande :reference est bien reçue', ['reference' => $order->reference]))
            ->markdown('mail.orders.confirmation', [
                'order' => $order,
                'url' => url(Locale::path('/commande/confirmation/'.$order->reference, $order->locale).'?'.http_build_query(['token' => $order->guest_token])),
                'canReply' => $this->replyToAddress !== null,
            ]);

        if ($this->replyToAddress !== null) {
            $message->replyTo($this->replyToAddress);
        }

        return $message;
    }
}
