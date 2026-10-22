@use('App\Support\Money')
@php($rtl = app()->getLocale() === 'ar')
<x-mail::table>
| {{ __('Article') }} | {{ __('Qté') }} | {{ __('Montant') }} |
@if ($rtl)
|--------:|:---:|:--------|
@else
|:--------|:---:|--------:|
@endif
@foreach ($order->items as $item)
| {{ $item->name }}{{ $item->variant_label ? ' — '.$item->variant_label : '' }}@if ($item->selections->isNotEmpty())<br><small>{{ $item->selections->map(fn ($selection) => $selection->product_name.' '.__(':size ml', ['size' => $selection->size_ml]))->join(__(', ')) }}</small>@endif | {{ $item->quantity }} | {{ Money::format($item->line_total) }} |
@endforeach
| {{ __('Sous-total') }} | | {{ Money::format($order->subtotal) }} |
@if ($order->discount_total > 0)
| {{ __('Remise') }}{{ $order->coupon_code ? ' ('.$order->coupon_code.')' : '' }} | | −{{ Money::format($order->discount_total) }} |
@endif
| {{ __('Livraison') }} | | {{ $order->delivery_fee > 0 ? Money::format($order->delivery_fee) : __('Offerte') }} |
| **{{ __('Total') }}** | | **{{ Money::format($order->total) }}** |
</x-mail::table>

{{ __('Paiement : :method', ['method' => $order->payment_method->label()]) }}
