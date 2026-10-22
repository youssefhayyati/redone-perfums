@use('App\Support\MoroccanPhone')
<x-mail::message>
# Nouvelle commande {{ $order->reference }}

**{{ $order->customer_name }}** · {{ MoroccanPhone::format($order->phone) }}@if ($order->email) · {{ $order->email }}@endif<br>
{{ $order->address }}, {{ $order->city_name }}@if ($order->delivery_zone_name) ({{ $order->delivery_zone_name }})@endif

@if ($order->delivery_notes)
<x-mail::panel>
Instructions de livraison : {{ $order->delivery_notes }}
</x-mail::panel>

@endif
@include('mail.orders.partials.summary')

<x-mail::button :url="$url">
Ouvrir la commande
</x-mail::button>
</x-mail::message>
