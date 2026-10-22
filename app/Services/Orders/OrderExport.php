<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Support\MoroccanPhone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Orders as a CSV spreadsheet for accounting and couriers. Written for Excel in French:
 * semicolon separators, UTF-8 with a byte order mark, amounts in dirhams ("450,00").
 */
final class OrderExport
{
    private const HEADERS = [
        'Référence', 'Date', 'Statut', 'Paiement', 'Moyen de paiement', 'Client', 'Téléphone', 'E-mail',
        'Ville', 'Zone', 'Adresse', 'Instructions', 'Articles', 'Détail', 'Sous-total (DH)', 'Remise (DH)',
        'Livraison (DH)', 'Total (DH)', 'Code promo', 'Transporteur', 'N° de suivi', 'Langue',
    ];

    /**
     * Streams the orders of the query to the response output, 200 at a time.
     *
     * @param  Builder<Order>  $orders
     */
    public function write(Builder $orders): void
    {
        $output = fopen('php://output', 'w');
        fwrite($output, "\u{FEFF}");
        fputcsv($output, self::HEADERS, ';');

        $orders->chunk(200, function (Collection $chunk) use ($output) {
            foreach ($chunk as $order) {
                fputcsv($output, $this->row($order), ';');
            }
        });

        fclose($output);
    }

    /**
     * @return list<string|int>
     */
    public function row(Order $order): array
    {
        return [
            $order->reference,
            $order->placed_at->format('d/m/Y H:i'),
            $order->status->label(),
            $order->payment_status->label(),
            $order->payment_method->label(),
            $order->customer_name,
            MoroccanPhone::format($order->phone),
            $order->email ?? '',
            $order->city_name,
            $order->delivery_zone_name ?? '',
            $order->address,
            $order->delivery_notes ?? '',
            $order->items_count,
            $order->items->map(fn (OrderItem $item) => $this->describe($item))->implode(' | '),
            $this->dirhams($order->subtotal),
            $this->dirhams($order->discount_total),
            $this->dirhams($order->delivery_fee),
            $this->dirhams($order->total),
            $order->coupon_code ?? '',
            $order->carrier ?? '',
            $order->tracking_number ?? '',
            $order->locale === 'ar' ? 'Arabe' : 'Français',
        ];
    }

    /** "2 × Nuit d’Ambre 50 ml", or a pack with the perfumes chosen for it. */
    private function describe(OrderItem $item): string
    {
        $line = "{$item->quantity} × {$item->name}".($item->variant_label ? " {$item->variant_label}" : '');

        if ($item->selections->isEmpty()) {
            return $line;
        }

        return $line.' ('.$item->selections->map(fn ($selection) => "{$selection->product_name} {$selection->size_ml} ml")->implode(', ').')';
    }

    private function dirhams(int $centimes): string
    {
        return number_format($centimes / 100, 2, ',', '');
    }
}
