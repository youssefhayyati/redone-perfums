<?php

namespace App\Notifications;

use App\Models\ProductVariant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Formats that an order just took down to their low-stock threshold, for the store.
 */
class LowStockAlert extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<ProductVariant>  $variants  With their stock right after the order.
     */
    public function __construct(public array $variants)
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
        $count = count($this->variants);

        return (new MailMessage)
            ->subject($count === 1 ? 'Stock bas : '.$this->variants[0]->product?->name.' — '.$this->variants[0]->label() : "Stock bas : {$count} formats à réapprovisionner")
            ->markdown('mail.inventory.low-stock-alert', [
                'variants' => $this->variants,
                'url' => url('/admin/stock?filter=low'),
            ]);
    }
}
