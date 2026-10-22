@use('App\Support\MoroccanPhone')
@use('Illuminate\Support\Str')
<x-mail::message>
# Merci, {{ Str::before($order->customer_name, ' ') }}.

Votre commande **{{ $order->reference }}** est bien enregistrée. Nous la préparons avec soin.

@include('mail.orders.partials.summary')

**Livraison**<br>
{{ $order->customer_name }}<br>
{{ $order->address }}<br>
{{ $order->city_name }}<br>
{{ MoroccanPhone::format($order->phone) }}

<x-mail::button :url="$url">
Suivre ma commande
</x-mail::button>

@if ($canReply)
Une question ? Répondez simplement à cet e-mail.

@endif
À très vite,<br>
{{ config('app.name') }}
</x-mail::message>
