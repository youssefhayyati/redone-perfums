<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Support\Locale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * News of an order for the customer: confirmed, on its way (with the carrier and tracking
 * number when known, and the amount to have ready), delivered or cancelled.
 */
class OrderStatusUpdate extends Notification implements ShouldQueue
{
    use Queueable;

    /** The statuses a customer hears about. */
    public const STATUSES = [OrderStatus::Confirmed, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Cancelled];

    /**
     * @param  string|null  $replyToAddress  The store's contact address, so customers can simply reply.
     */
    public function __construct(public Order $order, public OrderStatus $status, public ?string $replyToAddress = null)
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
        $order = $this->order;
        $reference = ['reference' => $order->reference];

        $message = (new MailMessage)
            ->subject(match ($this->status) {
                OrderStatus::Confirmed => __('Votre commande :reference est confirmée', $reference),
                OrderStatus::Shipped => __('Votre commande :reference est en route', $reference),
                OrderStatus::Delivered => __('Votre commande :reference est livrée', $reference),
                default => __('Votre commande :reference est annulée', $reference),
            })
            ->markdown('mail.orders.status-update', [
                'order' => $order,
                'status' => $this->status,
                'payOnDelivery' => $order->payment_method === PaymentMethod::CashOnDelivery && $order->payment_status !== PaymentStatus::Paid,
                'url' => url(Locale::path('/commande/confirmation/'.$order->reference, $order->locale).'?'.http_build_query(['token' => $order->guest_token])),
                'canReply' => $this->replyToAddress !== null,
            ]);

        if ($this->replyToAddress !== null) {
            $message->replyTo($this->replyToAddress);
        }

        return $message;
    }
}
