@use('App\Support\Money')
<x-mail::table>
| Article | Qté | Montant |
|:--------|:---:|--------:|
@foreach ($order->items as $item)
| {{ $item->name }}{{ $item->variant_label ? ' — '.$item->variant_label : '' }}@if ($item->selections->isNotEmpty())<br><small>{{ $item->selections->map(fn ($selection) => $selection->product_name.' '.$selection->size_ml.' ml')->join(', ') }}</small>@endif | {{ $item->quantity }} | {{ Money::format($item->line_total) }} |
@endforeach
| Sous-total | | {{ Money::format($order->subtotal) }} |
@if ($order->discount_total > 0)
| Remise{{ $order->coupon_code ? ' ('.$order->coupon_code.')' : '' }} | | −{{ Money::format($order->discount_total) }} |
@endif
| Livraison | | {{ $order->delivery_fee > 0 ? Money::format($order->delivery_fee) : 'Offerte' }} |
| **Total** | | **{{ Money::format($order->total) }}** |
</x-mail::table>

Paiement : {{ $order->payment_method->label() }}
