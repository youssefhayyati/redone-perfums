@use('App\Support\MoroccanPhone')
@use('Illuminate\Support\Str')
<x-mail::message>
# {{ __('Merci, :name.', ['name' => Str::before($order->customer_name, ' ')]) }}

{{ __('Votre commande **:reference** est bien enregistrée. Nous la préparons avec soin.', ['reference' => $order->reference]) }}

@include('mail.orders.partials.summary')

**{{ __('Livraison') }}**<br>
{{ $order->customer_name }}<br>
{{ $order->address }}<br>
{{ $order->city_name }}<br>
<span dir="ltr">{{ MoroccanPhone::format($order->phone) }}</span>

<x-mail::button :url="$url">
{{ __('Suivre ma commande') }}
</x-mail::button>

@if ($canReply)
{{ __('Une question ? Répondez simplement à cet e-mail.') }}

@endif
{{ __('À très vite,') }}<br>
{{ config('app.name') }}
</x-mail::message>
